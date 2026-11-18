import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'senha-forte-123';
let counter = 0;
const uniqueEmail = (name: string) => `${name}.${Date.now()}.${counter++}@exemplo.com`;

async function signup(page: Page, name: string, familyName?: string) {
  await page.goto('/criar-conta');
  await page.getByLabel('Seu nome').fill(name);
  await page.getByLabel('E-mail').fill(uniqueEmail(name.toLowerCase()));
  await page.getByLabel('Senha').fill(PASSWORD);
  if (familyName !== undefined) await page.getByLabel('Nome da família').fill(familyName);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
}

async function openNewEvent(page: Page) {
  const isCompact = (page.viewportSize()?.width ?? 0) <= 1080;
  if (isCompact) await page.getByRole('button', { name: 'Novo evento' }).last().click();
  else await page.getByRole('button', { name: 'Novo evento' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Novo evento' })).toBeVisible();
}

async function createEvent(page: Page, title: string) {
  await openNewEvent(page);
  const dialog = page.getByRole('dialog', { name: 'Novo evento' });
  await dialog.getByLabel('Título').fill(title);
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialog).toBeHidden();
}

async function hasNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test('a family signs up, adds an event and sees it on the calendar', async ({ page }) => {
  await signup(page, 'Ana', 'Família Teste');
  await createEvent(page, 'Dentista da Lia');
  await expect(page.getByRole('button', { name: /Dentista da Lia/ }).first()).toBeVisible();
  await hasNoHorizontalScroll(page);
});

test('editing and deleting an event', async ({ page }) => {
  await signup(page, 'Bia', 'Família Edição');
  await createEvent(page, 'Feira');
  await page.getByRole('button', { name: /Feira/ }).first().click();
  const edit = page.getByRole('dialog', { name: 'Editar evento' });
  await edit.getByLabel('Título').fill('Feira orgânica');
  await edit.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('button', { name: /Feira orgânica/ }).first()).toBeVisible();

  await page.getByRole('button', { name: /Feira orgânica/ }).first().click();
  await edit.getByRole('button', { name: 'Excluir' }).click();
  await edit.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await expect(edit).toBeHidden();
  await expect(page.getByRole('button', { name: /Feira orgânica/ })).toHaveCount(0);
});

test('reopening an event keeps its times', async ({ page }) => {
  await signup(page, 'Gabi', 'Família Horários');
  await openNewEvent(page);
  const dialog = page.getByRole('dialog', { name: 'Novo evento' });
  await dialog.getByLabel('Título').fill('Dentista');
  await dialog.getByLabel('Hora').first().fill('14:00');
  await dialog.getByLabel('Hora').first().dispatchEvent('change');
  await expect(dialog.getByLabel('Hora').last()).toHaveValue('15:00');
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialog).toBeHidden();

  // A fresh page starts the form from its defaults, which is when the end time used to drift.
  await page.reload();
  await page.getByRole('button', { name: /Dentista/ }).first().click();
  const edit = page.getByRole('dialog', { name: 'Editar evento' });
  await expect(edit.getByLabel('Hora').first()).toHaveValue('14:00');
  await expect(edit.getByLabel('Hora').last()).toHaveValue('15:00');
});

test('the event dialog shows field errors from the server', async ({ page }) => {
  await signup(page, 'Caio', 'Família Erros');
  await openNewEvent(page);
  const dialog = page.getByRole('dialog', { name: 'Novo evento' });
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialog.getByText('Dê um título ao evento')).toBeVisible();
  await dialog.getByRole('button', { name: 'Fechar' }).click();
  await expect(dialog).toBeHidden();
});

test('a second person joins with the invite link and gets live updates', async ({ page, browser }, testInfo) => {
  await signup(page, 'Ana', 'Família Convite');
  await page.goto('/familia');
  const code = (await page.getByLabel('Código de convite').textContent())?.replace('-', '').trim() ?? '';
  expect(code).toHaveLength(8);

  const other = await browser.newContext({ ...testInfo.project.use, baseURL: testInfo.project.use.baseURL });
  const bruno = await other.newPage();
  await bruno.goto(`/convite/${code}`);
  await expect(bruno.getByRole('heading', { name: 'Entrar na Família Convite' })).toBeVisible();
  await bruno.getByLabel('Seu nome').fill('Bruno');
  await bruno.getByLabel('E-mail').fill(uniqueEmail('bruno'));
  await bruno.getByLabel('Senha').fill(PASSWORD);
  await bruno.getByRole('button', { name: 'Entrar na família' }).click();
  await expect(bruno).toHaveURL(/\/(\?.*)?$/);

  await page.goto('/');
  await createEvent(page, 'Reunião de pais');
  await expect(bruno.getByRole('button', { name: /Reunião de pais/ }).first()).toBeVisible({ timeout: 10_000 });
  await other.close();
});

test('admins add a profile without account', async ({ page }) => {
  await signup(page, 'Dani', 'Família Perfis');
  await page.goto('/familia');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Adicionar pessoa' });
  await dialog.getByLabel('Nome').fill('Theo');
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Perfil sem conta')).toBeVisible();
  await hasNoHorizontalScroll(page);
});

test('logged-out visitors are sent to login and come back after it', async ({ page }) => {
  const email = uniqueEmail('fabi');
  await page.goto('/criar-conta');
  await page.getByLabel('Seu nome').fill('Fabi');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/(\?.*)?$/);
  await page.request.post('/api/auth/logout');

  await page.goto('/familia');
  await expect(page).toHaveURL(/\/entrar\?next=(%2F|\/)familia/);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/familia$/);
});

test('phone layout opens full-screen dialogs with sticky actions', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone', 'phone only');
  await signup(page, 'Eva', 'Família Celular');
  await expect(page.getByRole('button', { name: 'Agenda' })).toHaveAttribute('aria-pressed', 'true');
  await openNewEvent(page);
  const box = await page.getByRole('dialog', { name: 'Novo evento' }).boundingBox();
  const viewport = page.viewportSize();
  expect(box?.width).toBe(viewport?.width);
  await hasNoHorizontalScroll(page);
});
