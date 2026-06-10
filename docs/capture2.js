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

  // --- Redefinir senha (página pública) ---
  await page.goto(`${BASE}/redefinir-senha`);
  await page.waitForLoadState('networkidle');
  await shot(page, '11_redefinir_senha');

  // Volta ao CRM (relogin se necessário)
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  // Pode já estar logado; se redirecionar para kanban, ok
  try {
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/kanban', { timeout: 8000 });
  } catch (_) {}

  // --- Clientes / [id] detalhe ---
  await page.goto(`${BASE}/clientes`);
  await page.waitForLoadState('networkidle');
  // Clicar na primeira linha expandível ou link
  const expandBtn = page.locator('table tbody tr button, table tbody tr a, [class*="clientes"] a[href*="/clientes/"]').first();
  if (await expandBtn.count() > 0) {
    await expandBtn.click();
    await page.waitForLoadState('networkidle');
    await shot(page, '04b_cliente_detalhe');
  } else {
    // Tentar pelo ícone chevron / botão expand na linha
    const chevron = page.locator('button svg, td button').last();
    if (await chevron.count() > 0) {
      await chevron.click();
      await page.waitForTimeout(800);
      await shot(page, '04b_cliente_detalhe');
    }
  }

  // --- Pedido detalhe /pedidos/[id] ---
  await page.goto(`${BASE}/pedidos`);
  await page.waitForLoadState('networkidle');
  const pedidoLink = page.locator('a[href*="/pedidos/"]').first();
  if (await pedidoLink.count() > 0) {
    await pedidoLink.click();
    await page.waitForLoadState('networkidle');
    await shot(page, '03c_pedido_detalhe_pagina');
  }

  // --- Preços aba Solicitações ---
  await page.goto(`${BASE}/precos`);
  await page.waitForLoadState('networkidle');
  const abaSolicita = page.locator('[role="tab"]:has-text("Solicitações"), button:has-text("Solicitações")').first();
  if (await abaSolicita.count() > 0) {
    await abaSolicita.click();
    await page.waitForTimeout(800);
    await shot(page, '07b_precos_solicitacoes');
  }

  // --- Configurações (página padrão /configuracoes) ---
  await page.goto(`${BASE}/configuracoes`);
  await page.waitForLoadState('networkidle');
  await shot(page, '12_config_default');

  // --- Configurações → Conta e segurança ---
  await page.goto(`${BASE}/configuracoes/conta`);
  await page.waitForLoadState('networkidle');
  await shot(page, '13_config_conta');

  // --- Configurações → Canais de entrada ---
  await page.goto(`${BASE}/configuracoes/canais`);
  await page.waitForLoadState('networkidle');
  await shot(page, '14_config_canais');

  // --- Configurações → Handoff e automação ---
  await page.goto(`${BASE}/configuracoes/automacao`);
  await page.waitForLoadState('networkidle');
  await shot(page, '15_config_automacao');

  // --- Configurações → Preços e catálogo ---
  await page.goto(`${BASE}/configuracoes/precos`);
  await page.waitForLoadState('networkidle');
  await shot(page, '16_config_precos');

  // --- Configurações → Sistema e saúde ---
  await page.goto(`${BASE}/configuracoes/sistema`);
  await page.waitForLoadState('networkidle');
  await shot(page, '17_config_sistema');

  // --- Kanban com painel lateral (clicar no card) ---
  await page.goto(`${BASE}/kanban`);
  await page.waitForLoadState('networkidle');
  const card = page.locator('[class*="card"], [class*="Card"]').filter({ hasText: 'Emerson' }).first();
  if (await card.count() > 0) {
    await card.click();
    await page.waitForTimeout(1000);
    await shot(page, '02b_kanban_painel_lateral');
  }

  await browser.close();
  console.log('\nCaptura complementar concluída!');
})();
