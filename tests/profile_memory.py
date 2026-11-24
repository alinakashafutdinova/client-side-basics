"""Профилирование через Chrome DevTools Protocol. Запуск: python3 tests/profile_memory.py.

Создаёт evidence/measurements.json и снимки интерфейса; не заменяет
ручные скриншоты именно из вкладки DevTools → Memory для отчёта преподавателю.
"""
from __future__ import annotations

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "evidence"
EVIDENCE.mkdir(exist_ok=True)


def parse_heap_snapshot(chunks):
    raw = ''.join(chunks)
    data = json.loads(raw)
    meta = data['snapshot']['meta']
    fields = meta['node_fields']
    size = len(fields)
    type_idx, name_idx, selfsize_idx = (fields.index(k) for k in ('type','name','self_size'))
    det_idx = fields.index('detachedness') if 'detachedness' in fields else None
    types = meta['node_types'][type_idx]
    strings = data['strings']
    nodes = data['nodes']
    detached = []
    domlike = 0
    for i in range(0,len(nodes),size):
        name = strings[nodes[i+name_idx]]
        if name.startswith('Detached ') or (det_idx is not None and nodes[i+det_idx] == 2):
            detached.append((name,nodes[i+selfsize_idx]))
        if name.startswith('HTML') or name.startswith('Detached HTML'):
            domlike += 1
    return {'heap_file_bytes':len(raw.encode('utf-8')),
            'heap_nodes':len(nodes)//size,
            'detached_nodes':len(detached),
            'detached_self_bytes':sum(x[1] for x in detached),
            'detached_examples':sorted({x[0] for x in detached})[:10],
            'dom_nodes_named':domlike}


def capture(cdp):
    cdp.send('HeapProfiler.collectGarbage')
    usage = cdp.send('Runtime.getHeapUsage')
    chunks=[]
    def on_chunk(data):
        chunks.append(data['chunk'])
    cdp.on('HeapProfiler.addHeapSnapshotChunk', on_chunk)
    try:
        cdp.send('HeapProfiler.takeHeapSnapshot', {'reportProgress': False})
    finally:
        cdp.remove_listener('HeapProfiler.addHeapSnapshotChunk',on_chunk)
    snap=parse_heap_snapshot(chunks)
    snap.update({'used_heap_bytes':usage['usedSize'], 'total_heap_bytes':usage['totalSize']})
    return snap


def main():
    # В тестовой среде локальные и сетевые URL браузером заблокированы.
    # Загружаю ту же разметку и те же исходники прямо в страницу через Playwright.
    html=(ROOT/'index.html').read_text(encoding='utf-8')
    html=html.replace('<script type="module" src="src/app.js"></script>','')
    html=html.replace('<link rel="stylesheet" href="style.css">','<style>'+(ROOT/'style.css').read_text(encoding='utf-8')+'</style>')
    js=(ROOT/'src/scenarios.js').read_text(encoding='utf-8').replace('export { ELEMENTS_PER_CYCLE, MemoryExperiments, TYPES };','')
    js+='\n'+(ROOT/'src/app.js').read_text(encoding='utf-8').replace("import { MemoryExperiments, TYPES } from './scenarios.js';",'')
    with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--disable-extensions'])
            context=browser.new_context(viewport={'width':1440,'height':900}, device_scale_factor=1)
            page=context.new_page()
            errors=[]
            page.on('pageerror',lambda err:errors.append(str(err)))
            page.set_content(html)
            page.evaluate(js)
            page.screenshot(path=str(EVIDENCE/'page-desktop.png'),full_page=True)
            mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1)
            mp=mobile.new_page();mp.set_content(html);mp.evaluate(js)
            mobile_width=mp.evaluate('document.documentElement.scrollWidth - window.innerWidth')
            mp.screenshot(path=str(EVIDENCE/'page-mobile.png'),full_page=True)
            mobile.close()

            cdp=context.new_cdp_session(page)
            cdp.send('HeapProfiler.enable')
            cdp.send('Runtime.enable')
            results={}
            for type_name in ('events','cache','timers'):
                section=page.locator('[data-scenario="'+type_name+'"]')
                snap_before=capture(cdp)
                stages=[{'stage':'Снимок 1: исходное состояние',**snap_before}]
                for stage in (2,3):
                    section.locator('[data-action="create"]').click()
                    assert section.locator('[data-counter="dom"]').inner_text()=='80'
                    section.locator('[data-action="remove"]').click()
                    assert section.locator('[data-counter="dom"]').inner_text()=='0'
                    expected=(stage-1)*80
                    assert section.locator('[data-counter="retained"]').inner_text()==str(expected)
                    measured=capture(cdp)
                    stages.append({'stage':f'Снимок {stage}: после {stage-1} цикла(ов)',**measured})
                section.locator('[data-action="repair"]').click()
                assert section.locator('[data-counter="retained"]').inner_text()=='0'
                repaired=capture(cdp)
                stages.append({'stage':'После исправления',**repaired})
                results[type_name]=stages
                print(type_name,[(s['stage'],s['used_heap_bytes'],s['detached_nodes']) for s in stages],flush=True)
            assert not errors,errors
            (EVIDENCE/'measurements.json').write_text(json.dumps({
                'browser':'Chromium (в автоматическом тесте)',
                'method':'CDP HeapProfiler.takeHeapSnapshot + HeapProfiler.collectGarbage',
                'count_per_cycle':80,
                'mobile_horizontal_overflow_px':mobile_width,
                'console_page_errors':errors,
                'results':results
            },ensure_ascii=False,indent=2),encoding='utf-8')
            browser.close()
            print('DONE',flush=True)


if __name__=='__main__':
    main()
