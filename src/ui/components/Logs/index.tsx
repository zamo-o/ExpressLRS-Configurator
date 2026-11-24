import { FunctionComponent, memo, useLayoutEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { SxProps, Theme } from '@mui/system';
import { EMPTY_LOG, LogSnapshot } from '../../library/LogBuffer';

const styles: Record<string, SxProps<Theme>> = {
  root: {
    minHeight: '500px',
    maxHeight: '500px',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  logs: {
    whiteSpace: 'pre-wrap',
    wordWrap: 'break-word',
  },
  chunks: {
    display: 'block',
    '& > span': {
      display: 'block',
    },
  },
};

interface LogsProps {
  data: LogSnapshot;
}

/*
  Build / serial monitor logs can grow to megabytes. Rendering the whole log as
  one text makes the browser copy it and lay all of it out again on every
  batch (quadratic in the log length). Instead:
  - every chunk of complete lines is appended once, as its own block element,
    so the browser lays out only the new block (earlier blocks stay cached),
  - only the current unfinished line (tail) is re-rendered by React.
 */
const Logs: FunctionComponent<LogsProps> = memo(({ data }) => {
  const container = useRef<HTMLDivElement>(null);
  const chunksElement = useRef<HTMLElement>(null);
  const rendered = useRef<LogSnapshot>(EMPTY_LOG);

  useLayoutEffect(() => {
    const element = chunksElement.current;
    if (element === null) {
      return;
    }
    let from = rendered.current.count;
    if (data.chunks !== rendered.current.chunks || data.count < from) {
      // the log was reset -> start over
      element.textContent = '';
      from = 0;
    }
    if (data.count > from) {
      const fragment = document.createDocumentFragment();
      for (let i = from; i < data.count; i += 1) {
        const block = document.createElement('span');
        block.textContent = data.chunks[i];
        fragment.appendChild(block);
      }
      element.appendChild(fragment);
    }
    rendered.current = data;

    if (container.current !== null) {
      container.current.scrollTop = container.current.scrollHeight;
    }
  }, [data]);

  return (
    <Box ref={container} sx={styles.root}>
      <Box component="pre" sx={styles.logs}>
        <Box component="code" ref={chunksElement} sx={styles.chunks} />
        <code>{data.tail}</code>
      </Box>
    </Box>
  );
});

export default Logs;
