import type { IncomingMessage, ServerResponse } from 'http';
import app from '../server';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as any)(req, res);
}
