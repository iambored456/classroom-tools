import test from 'node:test'
import assert from 'node:assert/strict'
import {landingShareUrl, questionShareUrl} from './qr-share.js'

test('students get the published landing page when sharing from a local computer', () => {
  for (const href of [
    'http://localhost:5194/open-middle/',
    'http://127.0.0.1:5194/open-middle/#38',
    'http://[::1]:5194/open-middle/',
    'http://0.0.0.0:5194/open-middle/',
    'http://math.localhost:5194/open-middle/',
    'file:///C:/classroom-tools/open-middle/index.html',
  ]) assert.equal(landingShareUrl(href), 'https://iambored456.github.io/classroom-tools/open-middle/')
})

test('a hosted landing page keeps its deployment path without question or tracking state', () => {
  assert.equal(
    landingShareUrl('https://school.example/math/open-middle/?source=teacher#38'),
    'https://school.example/math/open-middle/',
  )
})

test('a classroom LAN address remains usable by devices on that network', () => {
  assert.equal(landingShareUrl('http://192.168.1.25:5194/open-middle/'), 'http://192.168.1.25:5194/open-middle/')
})

test('question sharing from localhost links to the same published question', () => {
  assert.equal(questionShareUrl('http://localhost:5194/open-middle/?source=teacher#38', 34),
    'https://iambored456.github.io/classroom-tools/open-middle/#34')
})

test('question sharing preserves the hosted path and full string question ID', () => {
  assert.equal(questionShareUrl('https://school.example/math/open-middle/?source=teacher#109', '109-comparing-fractions'),
    'https://school.example/math/open-middle/#109-comparing-fractions')
  assert.equal(questionShareUrl('http://192.168.1.25:5194/open-middle/#34', 59),
    'http://192.168.1.25:5194/open-middle/#59')
})
