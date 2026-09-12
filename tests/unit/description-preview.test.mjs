import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../../src/renderer/components/WatchVideoDescription/WatchVideoDescription.vue', import.meta.url), 'utf8')
const expandedExpression = source.match(/const isExpanded = computed\(\(\) => (.*)\)/)[1]
const measureBody = source.match(/function measureDescription\(\) \{([\s\S]*?)\n\}/)[1]

function measure({ previewOnly = false, alwaysExpanded = false, short = true, description = 'Sie haben Post\nDer Klassiker von AOL' } = {}) {
  const context = vm.createContext({
    props: { previewOnly, alwaysExpanded },
    shownDescription: description,
    showFullDescription: { value: false },
    showControls: { value: false },
    hasMeasured: false,
    descriptionContainer: { value: { $el: { clientHeight: 48, scrollHeight: short ? 48 : 240 } } },
    isShortDescription: () => short,
    nextTick() {},
    updateDescriptionLayout() {},
  })
  vm.runInContext(`(function () {${measureBody}})()`, context)
  return vm.runInContext(expandedExpression, context)
}

test('mobile previews stay collapsed after measuring short descriptions', () => {
  assert.equal(measure({ previewOnly: true }), false)
})

test('mobile previews stay collapsed for long and empty descriptions with metadata', () => {
  assert.equal(measure({ previewOnly: true, short: false }), false)
  assert.equal(measure({ previewOnly: true, description: '' }), false)
})

test('regular descriptions expand short content and keep long content collapsed', () => {
  assert.equal(measure(), true)
  assert.equal(measure({ short: false }), false)
  assert.equal(measure({ description: '' }), true)
  assert.equal(measure({ alwaysExpanded: true, short: false }), true)
})
