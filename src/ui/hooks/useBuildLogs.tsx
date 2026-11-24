import { useEffect, useRef, useState } from 'react';
import { useSubscription } from '@apollo/client/react';
import { BuildLogUpdatesDocument } from '../gql/generated/types';
import client from '../gql';
import EventsBatcher from '../library/EventsBatcher';
import LogBuffer, { EMPTY_LOG, LogSnapshot } from '../library/LogBuffer';

export default function useBuildLogs() {
  /*
    We batch log events in order to save React.js state updates and rendering performance.
   */
  const [buildLogs, setLogs] = useState<LogSnapshot>(EMPTY_LOG);
  const logBufferRef = useRef<LogBuffer>(new LogBuffer());
  const eventsBatcherRef = useRef<EventsBatcher<string> | null>(null);
  useEffect(() => {
    eventsBatcherRef.current = new EventsBatcher<string>(200);
    eventsBatcherRef.current.onBatch((newLogs) => {
      setLogs(logBufferRef.current.append(newLogs));
    });
  }, []);
  useSubscription(BuildLogUpdatesDocument, {
    fetchPolicy: 'network-only',
    client,
    onData: ({ data }) => {
      const args = data.data?.buildLogUpdates.data;
      if (args !== undefined && eventsBatcherRef.current !== null) {
        eventsBatcherRef.current.enqueue(args);
      }
    },
  });

  const resetLogs = () => {
    logBufferRef.current.reset();
    setLogs(EMPTY_LOG);
  };

  return {
    buildLogs,
    resetLogs,
  };
}
