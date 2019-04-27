import prepare from '@pnpm/prepare'
import fs = require('mz/fs')
import path = require('path')
import rimraf = require('rimraf-then')
import tape = require('tape')
import promisifyTape from 'tape-promise'
import { execPnpm } from '../utils'

const test = promisifyTape(tape)
const testOnly = promisifyTape(tape.only)
const testSkip = promisifyTape(tape.skip)

test('caching side effects of native package', async function (t) {
  const project = prepare(t)

  await execPnpm('install', '--side-effects-cache', 'bcrypt@3.0.6')
  const storePath = await project.getStorePath()
  const cacheBuildDir = path.join(storePath, 'localhost+4873', 'bcrypt', '3.0.6', 'side_effects', `${process.platform}-${process.arch}-node-${process.version.split('.')[0]}`, 'package', 'build')
  const stat1 = await fs.stat(cacheBuildDir)

  t.ok(await fs.exists(path.join('node_modules', 'bcrypt', 'build')), 'build folder created')
  t.ok(await fs.exists(cacheBuildDir), 'build folder created in side effects cache')

  await execPnpm('install', 'bcrypt@3.0.6', '--side-effects-cache')
  const stat2 = await fs.stat(cacheBuildDir)
  t.equal(stat1.ino, stat2.ino, 'existing cache is not overridden')

  await execPnpm('install', 'bcrypt@3.0.6', '--side-effects-cache', '--force')
  const stat3 = await fs.stat(cacheBuildDir)
  t.notEqual(stat1.ino, stat3.ino, 'cache is overridden when force is true')

  t.end()
})

test('using side effects cache', async function (t) {
  const project = prepare(t)

  // Right now, hardlink does not work with side effects, so we specify copy as the packageImportMethod
  // We disable verifyStoreIntegrity because we are going to change the cache
  await execPnpm('install', 'bcrypt@3.0.6', '--side-effects-cache', '--no-verify-store-integrity', '--package-import-method', 'copy')
  const storePath = await project.getStorePath()

  const cacheBuildDir = path.join(storePath, 'localhost+4873', 'bcrypt', '3.0.6', 'side_effects', `${process.platform}-${process.arch}-node-${process.version.split('.')[0]}`, 'package', 'build')
  await fs.writeFile(path.join(cacheBuildDir, 'new-file.txt'), 'some new content')

  await rimraf('node_modules')
  await execPnpm('install', 'bcrypt@3.0.6', '--side-effects-cache', '--no-verify-store-integrity', '--package-import-method', 'copy')

  t.ok(await fs.exists(path.join('node_modules', 'bcrypt', 'build', 'new-file.txt')), 'side effects cache correctly used')

  t.end()
})

// TODO: unskip when a newer version of bcrypt comes out (3.0.5 fails)
testSkip('readonly side effects cache', async function (t) {
  const project = prepare(t)

  await execPnpm('install', 'bcrypt@3.0.6', '--side-effects-cache', '--no-verify-store-integrity')
  const storePath = await project.getStorePath()

  // Modify the side effects cache to make sure we are using it
  const cacheBuildDir = path.join(
    storePath,
    'localhost+4873',
    'bcrypt',
    '3.0.6',
    'side_effects',
    `${process.platform}-${process.arch}-node-${process.version.split('.')[0]}`,
    'package',
    'build',
  )
  await fs.writeFile(path.join(cacheBuildDir, 'new-file.txt'), 'some new content')

  await rimraf('node_modules')
  await execPnpm('install', 'bcrypt@3.0.6', '--side-effects-cache-readonly', '--no-verify-store-integrity', '--package-import-method', 'copy')

  t.ok(await fs.exists(path.join('node_modules', 'bcrypt', 'build', 'new-file.txt')), 'readonly side effects cache correctly used')

  await rimraf('node_modules')
  // changing version to make sure we don't create the cache
  await execPnpm('install', 'bcrypt@3.0.5', '--side-effects-cache-readonly', '--no-verify-store-integrity', '--package-import-method', 'copy')

  t.ok(await fs.exists(path.join('node_modules', 'bcrypt', 'build')), 'build folder created')
  t.notOk(await fs.exists(path.join(storePath, 'localhost+4873', 'bcrypt', '3.0.5', 'side_effects', `${process.platform}-${process.arch}-node-${process.version.split('.')[0]}`, 'package', 'build')), 'cache folder not created')

  t.end()
})
