/**
 * @jest-environment jsdom
 */
import { act, createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import Logs from './index';
import LogBuffer, { LogSnapshot } from '../../library/LogBuffer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
  = true;

describe('<Logs />', () => {
  let host: HTMLDivElement;
  let root: Root;

  const renderLogs = (data: LogSnapshot) => {
    act(() => {
      root.render(createElement(Logs, { data }));
    });
  };
  const text = () => host.querySelector('pre')!.textContent;
  const blocks = () => host.querySelector('pre > code')!.children;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    act(() => {
      root = createRoot(host);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it('renders the whole log text', () => {
    const buffer = new LogBuffer();
    buffer.append(['Compiling a.o\n']);
    renderLogs(buffer.append(['Linking firmware.elf\n']));
    expect(text()).toBe('Compiling a.o\nLinking firmware.elf\n');
  });

  it('appends only new batches and keeps already rendered blocks', () => {
    const buffer = new LogBuffer();
    renderLogs(buffer.append(['first\n']));
    const firstBlock = blocks()[0];

    renderLogs(buffer.append(['second\n', 'third\n']));

    expect(text()).toBe('first\nsecond\nthird\n');
    expect(blocks()).toHaveLength(2); // one block per batch
    expect(blocks()[0]).toBe(firstBlock); // not re-created
  });

  it('shows an unfinished line and completes it when the rest arrives', () => {
    const buffer = new LogBuffer();
    renderLogs(buffer.append(['Connecting...']));
    expect(text()).toBe('Connecting...');
    expect(blocks()).toHaveLength(0);

    renderLogs(buffer.append(['. done\n']));
    expect(text()).toBe('Connecting.... done\n');
    expect(blocks()).toHaveLength(1);
  });

  it('clears the output when the log is reset', () => {
    const buffer = new LogBuffer();
    renderLogs(buffer.append(['old build\n', 'unfinished']));
    buffer.reset();
    renderLogs(buffer.append(['new build\n']));
    expect(text()).toBe('new build\n');
  });
});
