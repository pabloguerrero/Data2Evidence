import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  // step 1 - navigate to the portal
  await page.goto('https://localhost:443/portal');
  await page.locator('input[name="identifier"]').click();
  await page.locator('input[name="identifier"]').fill('admin');
  await page.locator('input[name="password"]').click();
  await page.locator('input[name="password"]').fill('Updatepassword12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('Demo dataset').first().click();
  await page.getByRole('link', { name: 'Cohorts' }).click();
  await page.getByRole('button', { name: 'D2E' }).click();

  // step 2 - conditional occurrence filter card
  await page.getByTitle('Add Filter Card').getByRole('button').click();
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click();
  await expect(page.locator('.loading-animation-component')).not.toBeVisible();

  // step 3 - select condition concept name
  await page.getByText('Condition Occurrence A').locator('..').locator('..').locator(' .dropdown').first().click();
  await page.locator('div').filter({ hasText: /^Condition concept Name$/ }).first().click();
  await page.locator('div').filter({ hasText: /^Condition concept set$/ }).first().click();  
  await page.locator('#stacked-chart').click();

  // step 4 - pop out results
  await page.getByTitle('Condition Occurrence A -').locator('div').nth(1).click();
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('abc');
  await expect(page.locator('[id="patient.interactions.conditionoccurrence.1"]')).toMatchAriaSnapshot(`- text: abc No suggestions available`);
  
  // step 5 - substring search
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('nemi');
  await expect(page.getByText('Anemia - Anemia')).toBeVisible();

  // step 6 - full term search
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('');
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('Hypothyroidism');
  await expect(page.getByText('Hypothyroidism - Hypothyroidism')).toBeVisible();
  await page.getByRole('textbox', { name: 'Enter search term' }).press('Escape');

  // step 7 - supported syntax
  await page.getByText('Supported SyntaxEnter a').click();
  await expect(page.getByRole('application')).toContainText('Supported Syntax');

  // step 8 - create concept set
  await page.getByText('Condition Occurrence A').locator('..').locator('..').locator(' .dropdown').first().click();
  await page.locator('div').filter({ hasText: /^Condition concept Name$/ }).first().click();
  await page.locator('div').filter({ hasText: /^Condition concept set$/ }).first().click();  
  await page.locator('#stacked-chart').click();
  await page.getByRole('button', { name: '+' }).click();
  await expect(page.locator('.loading-animation-component')).not.toBeVisible()
  await page.getByRole('textbox', { name: 'Concept set name' }).click();
  await page.getByRole('textbox', { name: 'Concept set name' }).fill('test_concept_set1');
  await page.getByRole('textbox', { name: 'search terms' }).click();
  await page.getByRole('textbox', { name: 'search terms' }).fill('10509002');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.locator('tbody')).toContainText('Acute bronchitis');
  await page.getByRole('row', { name: '260139 10509002 Acute' }).getByRole('img').click();
  await page.getByRole('textbox', { name: 'search terms' }).fill('271737000');
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('row', { name: '439777 271737000 Anemia 102.' }).getByRole('img').click();
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('tab', { name: 'Selected concepts' }).click();
  await page.screenshot({ path: 'screenshot_08_create_concept_set.png' });
  await page.getByRole('button', { name: 'Close' }).click();
  
  // step 8 - select concept set
  await page.getByTitle('Condition Occurrence A -').locator('div').nth(1).click();
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('test_concept_set1');
  await page.getByText('test_concept_set1 -').click();
  

  // step 8 - select condition occurrence
  await page.getByTitle('Add Filter Card').getByRole('button').click();
  await page.getByRole('menuitem', { name: 'Condition Occurrence' }).click();
  const condition_occur_b = page.getByText('Condition Occurrence B').locator('..').locator('..').locator(' .dropdown').first();
  await condition_occur_b.scrollIntoViewIfNeeded();
  await condition_occur_b.click();
  await page.locator('div').filter({ hasText: /^Condition concept Name$/ }).nth(3).click();
  await page.locator('div').filter({ hasText: /^Condition concept set$/ }).nth(3).click();  
  await page.getByTitle('Condition Occurrence B -').locator('div').nth(1).click();
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('acute');
  await page.getByText('Acute cholecystitis - Acute').click();
  await page.getByRole('textbox', { name: 'Enter search term' }).click();
  await page.screenshot({ path: 'screenshot_08_select_condition_occurrence.png' });
  
  // step 8 - incorrect Condition Occurrence concept 
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('abc');
  await expect(page.locator('[id="patient.interactions.conditionoccurrence.2"]')).toMatchAriaSnapshot(`- text: abc No suggestions available`);
  await page.getByText('abc').click();
  const conditionOccuErrorBgcolor = await page.getByText('abc').locator('..').evaluate(el =>
    window.getComputedStyle(el).backgroundColor); 
  expect(conditionOccuErrorBgcolor).toBe('rgb(226, 49, 1)');
  await page.getByTitle('Condition Occurrence B -').locator('span').nth(2).click();
  await page.locator('[id="patient.interactions.conditionoccurrence.2"] > div > .col > .form-group > .app-tag-input > .multiselect > .multiselect__tags').click();
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('Acute bronchiolitis');
  await page.getByText('Acute bronchitis - Acute').click();

  // step 8 - month of birth with correct input
  await page.locator('#pane-left').getByText('Basic Data').locator('..').locator('..').locator('.dropdown').click();
  await page.getByText('Month of Birth').click();
  await page.locator('#pane-left').getByText('Basic Data').locator('..').locator('..').locator('.dropdown').click()
  await page.getByTitle('Basic Data - Month of Birth').click();
  await page.getByRole('textbox').fill('[1-10]')
  await page.getByRole('textbox').press('Enter');
  const monthOfBirthBgcolor = await page.getByText('[1-10]').locator('..').evaluate(el =>
    window.getComputedStyle(el).backgroundColor); 
  expect(monthOfBirthBgcolor).toBe('rgb(143, 219, 254)');

  // step 8 - month of birth with incorrect input
  await page.getByTitle('Basic Data - Month of Birth').click();
  await page.getByRole('textbox').fill('5.x');
  await page.getByRole('textbox').press('Enter');
  const monthOfBirthErrorBgcolor = await page.getByText('5.x').locator('..').evaluate(el =>
    window.getComputedStyle(el).backgroundColor); 
  expect(monthOfBirthErrorBgcolor).toBe('rgb(226, 49, 1)');
  await page.screenshot({ path: 'screenshot_08_correct_incorrect_birth_input.png' });
  await page.locator('div').filter({ hasText: /^5\.x$/ }).locator('span').nth(1).click();

  //step 9 - remove filter card
  await page.getByText('Condition Occurrence A').locator('..').locator('..').locator(' .dropdown').first().click();
  await page.getByRole('menuitem', { name: 'Remove Filter Card' }).click();
  await page.waitForSelector('.loading-animation-component', { state: 'hidden' });
  await page.waitForSelector('text=2105 / 2694', { state: 'visible' });

  // step 10 - reset filters
  await page.getByRole('button', { name: '↺' }).click();
  await page.getByRole('button', { name: 'Reset' }).click();

  // step 12 - basic data filter for gender, gender concept id, measurement, observation
  await page.getByTitle('Basic Data - Gender').locator('div').nth(1).click();
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('Female');
  await page.getByText('FEMALE - FEMALE').click();
  await page.locator('#pane-left').getByText('Basic Data').locator('..').locator('..').locator('.dropdown').click();
  await page.getByText('Gender concept id').click();
  await page.getByTitle('Basic Data - Gender concept id').locator('div').nth(1).click();
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('8532');
  await page.getByText('- FEMALE').click();

  // step 13 - Measurement concept name
  await page.getByTitle('Add Filter Card').getByRole('button').click();
  await page.getByRole('menuitem', { name: 'Measurement' }).click();
  await expect(page.locator('.loading-animation-component')).not.toBeVisible();
  await page.getByText('Measurement A').locator('..').locator('..').locator(' .dropdown').first().click();
  await page.getByRole('menu',{'name':''}).getByText('Measurement concept Name').scrollIntoViewIfNeeded();
  await page.getByText('Measurement concept name').click();
  await page.getByRole('menu',{'name':''}).getByText('Measurement concept set').scrollIntoViewIfNeeded();
  await page.locator('div').filter({ hasText: /^Measurement concept set$/ }).first().click();
  await page.locator('#stacked-chart').click();
  await page.getByTitle('Measurement A - Measurement concept name').locator('div').nth(1).click();
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('glucose');
  await page.getByText('Glucose lab - Glucose lab').click();
  await page.locator('#stacked-chart').click();

  // Step 16 - Observation concept name
  await page.getByTitle('Add Filter Card').getByRole('button').click();
  await page.getByRole('menuitem', { name: 'Observation', exact: true }).click();
  await page.getByText('Observation A').locator('..').locator('..').locator(' .dropdown').first().click();
  await page.getByRole('menu',{'name':''}).getByText('Observation concept name').scrollIntoViewIfNeeded();
  await page.locator('div').filter({ hasText: /^Observation concept name$/ }).first().click();
  await page.getByRole('menu',{'name':''}).getByText('Observation concept set').scrollIntoViewIfNeeded();
  await page.locator('div').filter({ hasText: /^Observation concept set$/ }).first().click();
  await page.locator('#stacked-chart').click();
  await page.getByTitle('Observation A - Observation').locator('div').nth(1).click();
  await page.getByRole('textbox', { name: 'Enter search term' }).fill('Shell');
  await page.getByText('Shellfish allergy - Shellfish').click();
  await page.screenshot({ path: 'screenshot_16_final.png' });
  await page.getByRole('button', { name: '↺' }).click();
  await page.getByRole('button', { name: 'Reset' }).click();
});