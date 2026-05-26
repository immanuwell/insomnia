import fs from 'node:fs';
import path from 'node:path';

import electron from 'electron';

import { validatePluginName } from '../utils/plugin';

function getSafePluginDir(pluginName: string): string {
  const validationError = validatePluginName(pluginName);
  if (validationError) {
    throw new Error(validationError);
  }

  const sanitizedModuleName = pluginName.replace(/\.\.(\/|\\)/g, '');
  const baseDir = path.resolve(
    process.env['INSOMNIA_DATA_PATH'] || electron.app.getPath('userData'),
    'plugins',
  );
  const pluginDir = path.resolve(baseDir, sanitizedModuleName);
  const relativePath = path.relative(baseDir, pluginDir);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Invalid plugin name: path traversal detected');
  }
  if (!pluginDir.startsWith(baseDir + path.sep)) {
    throw new Error('Invalid plugin name: path traversal detected');
  }
  const reserved = ['con', 'prn', 'aux', 'nul'];
  if (reserved.includes(pluginName.toLowerCase())) {
    throw new Error('Plugin name is not allowed');
  }
  if (fs.existsSync(pluginDir)) {
    throw new Error('Plugin already exists');
  }
  return pluginDir;
}

export async function createPlugin(pluginName: string, mainJs: string) {
  const pluginDir = getSafePluginDir(pluginName);

  try {
    const packagePath = path.resolve(pluginDir, 'package.json');
    const mainJsPath = path.resolve(pluginDir, 'main.js');

    if (fs.existsSync(packagePath) || fs.existsSync(mainJsPath)) {
      throw new Error('Plugin files already exist');
    }

    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      packagePath,
      JSON.stringify(
        {
          name: pluginName,
          version: '0.0.1',
          private: true,
          insomnia: {
            name: pluginName.replace(/^insomnia-plugin-/, ''),
            description: '',
          },
          main: 'main.js',
        },
        null,
        2,
      ),
      { flag: 'wx' },
    );
    fs.writeFileSync(mainJsPath, mainJs, { flag: 'wx' });
  } catch (err: any) {
    console.error('Failed to create plugin files:', err);
    throw new Error('Plugin creation failed. Please try again.');
  }
}
