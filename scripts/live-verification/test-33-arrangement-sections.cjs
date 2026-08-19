/**
 * Arrangement sections: what is actually there?
 *
 * The map recorded these as "not built — initial state literal only, no add,
 * rename or delete handler anywhere". SectionBuilder does have those handlers,
 * so this drives them through the real UI and reports what happens, including
 * whether the result survives a room switch and a reload.
 */
const playwright = require('playwright');
const { launch, enterStudio, session } = require('./lib.cjs');

let failures = 0;
const errors = [];
function check(label, ok, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(46)} ${detail}`);
}

const SECTIONS = `s => JSON.stringify((s.sections || []).map(x => ({
  id: x.id, name: x.name, tag: x.tag, bars: x.bars, energy: x.energy,
})))`;
const sections = async (page) => JSON.parse(await session(page, SECTIONS));

(async () => {
  const { browser, page } = await launch(playwright, null);
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
  await enterStudio(page);

  console.log('=== ARRANGEMENT SECTIONS ===\n');

  await page.getByRole('button', { name: '2. BUILD', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1600);

  const start = await sections(page);
  console.log(`  start: ${start.map((s) => s.name).join(' | ')}`);

  // ---- add ----
  const addBtn = page.locator('#btn-add-section').first();
  check('an add control exists', (await addBtn.count()) > 0, '');
  // Deliberately not a forced click: a control covered by a drawer is not a
  // control a creator can use, and that is what this room used to do.
  await addBtn.click();
  await page.waitForTimeout(700);
  const afterAdd = await sections(page);
  check('adding a section works', afterAdd.length === start.length + 1,
        `${start.length} -> ${afterAdd.length}`);

  const added = afterAdd[afterAdd.length - 1];

  // ---- rename ----
  const nameField = page.locator(`[data-testid="section-name-${added.id}"]`).first();
  const foundField = (await nameField.count()) > 0;
  if (foundField) {
    await nameField.fill('Bridge Of My Own');
    await page.waitForTimeout(700);
  }
  const afterRename = await sections(page);
  const renamed = afterRename.find((s) => s.id === added.id);
  check('renaming a section works', foundField && !!renamed && renamed.name === 'Bridge Of My Own',
        foundField ? `name is "${renamed && renamed.name}"` : 'no name field found');

  // ---- can the arrangement be undone? ----
  // Before the reload: a reload starts a fresh session with an empty stack, so
  // testing undo after it would only prove that history does not survive.
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(900);
  const afterUndo = await sections(page);
  const undoneName = afterUndo.find((x) => x.id === added.id);
  check('undo takes back an arrangement edit', !!undoneName && undoneName.name !== 'Bridge Of My Own',
        `name is back to "${undoneName && undoneName.name}"`);

  await page.keyboard.press('Control+Shift+z');
  await page.waitForTimeout(900);
  const afterRedo = await sections(page);
  const redoneName = afterRedo.find((x) => x.id === added.id);
  check('redo restores it', !!redoneName && redoneName.name === 'Bridge Of My Own',
        `name is "${redoneName && redoneName.name}"`);

  // ---- survives a room switch ----
  await page.getByRole('button', { name: '4. MIX', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '2. BUILD', exact: false }).first().click({ force: true });
  await page.waitForTimeout(1500);
  const afterSwitch = await sections(page);
  check('sections survive a room switch',
        JSON.stringify(afterSwitch) === JSON.stringify(afterRedo),
        `${afterSwitch.length} sections`);

  // ---- survives a reload ----
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  const afterReload = await sections(page);
  const survived = afterReload.find((s) => s.id === added.id);
  check('sections survive a reload', !!survived && survived.name === 'Bridge Of My Own',
        survived ? `"${survived.name}" still there` : `${afterReload.length} sections, the new one gone`);

  // ---- delete ----
  const delTarget = (await sections(page)).find((s) => s.id === added.id);
  if (delTarget) {
    const delBtn = page.locator(`[data-testid="delete-section-${delTarget.id}"]`).first();
    if (await delBtn.count()) {
      await delBtn.click();
      await page.waitForTimeout(700);
      const afterDelete = await sections(page);
      check('deleting a section works', !afterDelete.some((s) => s.id === delTarget.id),
            `${afterDelete.length} sections left`);
    } else {
      check('a delete control exists', false, 'no delete control found');
    }
  }

  // ---- does clicking a bar in the density view throw? ----
  const barBtn = page.getByRole('button', { name: /^BAR 2$/ }).first();
  const errorsBefore = errors.length;
  if (await barBtn.count()) {
    await barBtn.click({ force: true });
    await page.waitForTimeout(800);
  }
  check('the arrangement view raises no errors', errors.length === errorsBefore,
        errors.slice(errorsBefore).join(' | ') || 'clean');

  if (errors.length) console.log(`\n  page errors seen: ${errors.join(' | ')}`);
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : failures + ' CHECK(S) FAILED'}`);
  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
