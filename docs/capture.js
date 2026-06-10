const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:3000';
const OUT = path.join(__dirname, 'screenshots');

const EMAIL = process.env.HUB_EMAIL || '';
const PASS  = process.env.HUB_PASS  || '';

async function shot(page, name) {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log(`✓ ${name}.png`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // --- Login ---
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await shot(page, '01_login');

  if (!EMAIL || !PASS) {
    console.log('HUB_EMAIL / HUB_PASS não definidos — capturando só a tela de login.');
    await browser.close();
    return;
  }

  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/kanban', { timeout: 15000 });

  // --- Kanban ---
  await page.waitForLoadState('networkidle');
  await shot(page, '02_kanban');

  // Clicar no primeiro card se houver
  const card = page.locator('[data-testid="kanban-card"], .kanban-card, [class*="kanban"] [class*="card"]').first();
  if (await card.count() > 0) {
    await card.click();
    await page.waitForTimeout(800);
    await shot(page, '02b_kanban_painel_lateral');
    // fechar painel
    await page.keyboard.press('Escape');
  }

  // --- Pedidos ---
  await page.goto(`${BASE}/pedidos`);
  await page.waitForLoadState('networkidle');
  await shot(page, '03_pedidos');

  // --- Pedido detalhe (primeiro pedido disponível) ---
  const linkPedido = page.locator('a[href*="/pedidos/"]').first();
  if (await linkPedido.count() > 0) {
    await linkPedido.click();
    await page.waitForLoadState('networkidle');
    await shot(page, '03b_pedido_detalhe');
    await page.goBack();
  }

  // --- Clientes ---
  await page.goto(`${BASE}/clientes`);
  await page.waitForLoadState('networkidle');
  await shot(page, '04_clientes');

  // --- Cliente detalhe (primeiro cliente disponível) ---
  const linkCliente = page.locator('a[href*="/clientes/"]').first();
  if (await linkCliente.count() > 0) {
    await linkCliente.click();
    await page.waitForLoadState('networkidle');
    await shot(page, '04b_cliente_detalhe');
    await page.goBack();
  }

  // --- CRM ---
  await page.goto(`${BASE}/crm`);
  await page.waitForLoadState('networkidle');
  await shot(page, '05_crm_dashboard');

  // --- Ofertas ---
  await page.goto(`${BASE}/ofertas`);
  await page.waitForLoadState('networkidle');
  await shot(page, '06_ofertas');

  // --- Preços ---
  await page.goto(`${BASE}/precos`);
  await page.waitForLoadState('networkidle');
  await shot(page, '07_precos_catalogo');

  // Aba Atualizações
  const abaAtualizacoes = page.locator('button:has-text("Atualizações"), [role="tab"]:has-text("Atualizações")').first();
  if (await abaAtualizacoes.count() > 0) {
    await abaAtualizacoes.click();
    await page.waitForTimeout(600);
    await shot(page, '07b_precos_atualizacoes');
  }

  // --- Configurações → Usuários ---
  await page.goto(`${BASE}/configuracoes/usuarios`);
  await page.waitForLoadState('networkidle');
  await shot(page, '08_config_usuarios');

  // --- Configurações → Funcionários ---
  await page.goto(`${BASE}/configuracoes/funcionarios`);
  await page.waitForLoadState('networkidle');
  await shot(page, '09_config_funcionarios');

  // --- Configurações → Follow-up ---
  await page.goto(`${BASE}/configuracoes/follow-up`);
  await page.waitForLoadState('networkidle');
  await shot(page, '10_config_followup');

  await browser.close();
  console.log('\nTodas as capturas concluídas!');
})();
