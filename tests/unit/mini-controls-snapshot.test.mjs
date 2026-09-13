import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const source = (await readFile(new URL('../../src/renderer/helpers/player/miniControlsSnapshot.js', import.meta.url), 'utf8'))
  .replace('export function ', 'function ')

for (const failure of ['image loading', 'canvas rendering']) {
  test(`mini controls retry unchanged content after failed ${failure}`, () => {
    const images = []
    const errors = []
    const changes = []
    let failCanvas = failure === 'canvas rendering'
    const root = {
      childNodes: [],
      matches: () => false,
      cloneNode: () => ({ style: { setProperty() {} }, querySelector: () => null })
    }
    const context = vm.createContext({
      window: { devicePixelRatio: 2 },
      getComputedStyle: () => ({
        visibility: 'visible', display: 'block', opacity: '1', content: 'none',
        * [Symbol.iterator]() {}
      }),
      HTMLInputElement: class {},
      XMLSerializer: class { serializeToString() { return '<div />' } },
      Image: class { constructor() { images.push(this) } },
      document: { createElement: () => ({
        getContext: () => ({ drawImage() { if (failCanvas) throw new Error('Canvas unavailable') } }),
        toDataURL: () => 'data:image/png;base64,controls'
      }) }
    })
    vm.runInContext(source, context)
    const snapshot = context.createMiniControlsSnapshot(value => changes.push(value), error => errors.push(error))
    snapshot.update(root, 240, 135, false)
    if (failure === 'image loading') images[0].onerror()
    else images[0].onload()
    assert.equal(errors.length, 1)
    assert.deepEqual(changes, [])

    failCanvas = false
    snapshot.update(root, 240, 135, false)
    assert.equal(images.length, 2, 'The unchanged controls must retry after the failed attempt')
    images[1].onload()
    assert.deepEqual(changes, ['data:image/png;base64,controls'])
    snapshot.update(root, 240, 135, false)
    assert.equal(images.length, 2, 'A successful retry is cached normally')
    snapshot.destroy()
  })
}
