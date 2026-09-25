import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const SEVERE = ['serious', 'critical'];

async function severeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return violations.filter((v) => v.impact && SEVERE.includes(v.impact));
}

/** Errores de la política de contenido o de la consola que delatan una página rota. */
function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') problems.push(msg.text());
  });
  page.on('pageerror', (err) => problems.push(err.message));
  return problems;
}

const PUBLIC_PAGES = ['/login', '/terminos', '/privacidad', '/cookies'];

for (const path of PUBLIC_PAGES) {
  test(`página pública ${path}: carga sin errores y sin fallos graves de accesibilidad`, async ({ page }) => {
    const problems = watchConsole(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['content-security-policy']).toContain("'nonce-");
    await page.waitForLoadState('networkidle');

    expect(problems).toEqual([]);
    expect(await severeViolations(page)).toEqual([]);
  });
}

test('la página se hidrata con la política de contenido activa', async ({ page }) => {
  await page.goto('/login');
  const password = page.getByLabel(/contraseña/i).first();
  await password.fill('algo-de-prueba');
  await page.getByRole('button', { name: /mostrar contraseña/i }).click();
  await expect(password).toHaveAttribute('type', 'text');
});

test('una ruta protegida sin sesión lleva al inicio de sesión', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login/);
});

test('una ruta desconocida sin sesión también lleva al inicio de sesión', async ({ page }) => {
  await page.goto('/esta-ruta-no-existe');
  await expect(page).toHaveURL(/\/login/);
});

test('las credenciales incorrectas muestran un error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/correo/i).fill('nadie@ejemplo.test');
  await page
    .getByLabel(/contraseña/i)
    .first()
    .fill('clave-incorrecta-1');
  await page.getByRole('button', { name: /iniciar sesión|ingresar/i }).click();
  await expect(page.getByText(/credenciales inválidas/i)).toBeVisible();
});

// Un recorrido por rol: se ejecuta solo si se entregan las credenciales de una cuenta de prueba.
const ROLES = [
  { name: 'ADMIN', url: /\/admin/ },
  { name: 'MENTOR', url: /\/mentor/ },
  { name: 'STUDENT', url: /\/estudiante/ },
] as const;

for (const role of ROLES) {
  const email = process.env[`E2E_${role.name}_EMAIL`];
  const password = process.env[`E2E_${role.name}_PASSWORD`];

  test(`recorrido de ${role.name}: inicia sesión, ve su panel y sale`, async ({ page }) => {
    test.skip(!email || !password, `Faltan E2E_${role.name}_EMAIL y E2E_${role.name}_PASSWORD`);
    const problems = watchConsole(page);

    await page.goto('/login');
    await page.getByLabel(/correo/i).fill(email!);
    await page
      .getByLabel(/contraseña/i)
      .first()
      .fill(password!);
    await page.getByRole('button', { name: /iniciar sesión|ingresar/i }).click();
    await expect(page).toHaveURL(role.url);
    await page.waitForLoadState('networkidle');

    expect(await severeViolations(page)).toEqual([]);
    expect(problems).toEqual([]);

    // En escritorio el cierre de sesión está en el menú de la cuenta; en móvil, en el cajón lateral.
    const drawerButton = page.getByRole('button', { name: /abrir menú/i });
    if (await drawerButton.isVisible()) await drawerButton.click();
    else await page.locator('button[aria-haspopup="menu"]').click();
    await page
      .getByRole('menuitem', { name: /cerrar sesión/i })
      .or(page.getByRole('button', { name: /cerrar sesión/i }))
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/login/);
  });
}
