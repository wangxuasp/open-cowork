import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const sidebarPath = path.resolve(process.cwd(), 'src/renderer/components/Sidebar.tsx');
const welcomeViewPath = path.resolve(process.cwd(), 'src/renderer/components/WelcomeView.tsx');
const logoPath = path.resolve(process.cwd(), 'resources/omni-worker-logo.png');

describe('Omni Worker logo entry', () => {
  it('uses the Omni Worker logo in navigation and welcome views', () => {
    const sidebar = fs.readFileSync(sidebarPath, 'utf8');
    const welcomeView = fs.readFileSync(welcomeViewPath, 'utf8');

    expect(fs.existsSync(logoPath)).toBe(true);
    expect(sidebar).toContain('../../../resources/omni-worker-logo.png');
    expect(welcomeView).toContain('../../../resources/omni-worker-logo.png');
  });
});
