const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, 'screenshots');
const EMAIL = 'emersontrindade45@gmail.com';
const PASS  = '123456';

async function shot(page, name) {
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log(`✓ ${name}.png`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Login
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/kanban', { timeout: 15000 });

  // --- Kanban painel lateral: clicar no card pelo texto ---
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  // Tentar clicar em qualquer elemento com texto "Emerson" que seja clicável
  const cardTexts = await page.locator('text=Emerson').all();
  console.log(`Cards encontrados: ${cardTexts.length}`);
  if (cardTexts.length > 0) {
    await cardTexts[0].click();
    await page.waitForTimeout(1500);
    await shot(page, '02b_kanban_painel_lateral');
  }

  // --- Clientes detalhe: navegar direto pela URL do cliente ---
  await page.goto(`${BASE}/clientes`);
  await page.waitForLoadState('networkidle');
  // Pegar o href do primeiro link de cliente
  const href = await page.locator('a[href*="/clientes/"]').first().getAttribute('href').catch(() => null);
  if (href) {
    await page.goto(`${BASE}${href}`);
    await page.waitForLoadState('networkidle');
    await shot(page, '04b_cliente_detalhe');
  } else {
    // Tentar encontrar o ID do cliente na tabela e construir URL
    // Verificar se a linha da tabela leva a alguma rota dinâmica ao clicar
    const row = page.locator('table tbody tr, [role="row"]').first();
    if (await row.count() > 0) {
      await row.click();
      await page.waitForTimeout(1000);
      if (page.url().includes('/clientes/')) {
        await shot(page, '04b_cliente_detalhe');
      }
    }
  }

  await browser.close();
  console.log('\nConcluído!');
})();
