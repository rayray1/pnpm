///<reference path="../../../typings/index.d.ts"/>
import { WANTED_LOCKFILE } from '@pnpm/constants'
import test = require('tape')
import assertProject from '@pnpm/assert-project'
import path = require('path')

test('assertProject()', async (t) => {
  const project = assertProject(t, path.join(__dirname, '..'))

  await project.has('tape')
  await project.hasNot('sfdsff3g34')
  t.equal(typeof project.requireModule('tape'), 'function', 'can require module')
  await project.isExecutable('.bin/tape')

  t.end()
})

test('assertProject() store functions', async (t) => {
  const project = assertProject(t, path.join(__dirname, 'fixture/project'), 'registry.npmjs.org')

  t.equal(typeof await project.getStorePath(), 'string', 'returns store path')
  await project.storeHas('is-positive', '3.1.0')
  t.equal(typeof await project.resolve('is-positive', '3.1.0'), 'string')
  await project.storeHasNot('is-positive', '3.100.0')
  t.ok(await project.readLockfile(), `loads wanted ${WANTED_LOCKFILE}`)
  t.ok(await project.readCurrentLockfile(), `loads current ${WANTED_LOCKFILE}`)
  t.ok(await project.readModulesManifest(), 'loads .modules.yaml')

  t.end()
})
