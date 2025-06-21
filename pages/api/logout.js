import { withSessionRoute } from '../../lib/session';

function logoutRoute(req, res) {
  req.session.destroy();
  res.setHeader('cache-control', 'no-store, max-age=0');
  res.status(200).json({ ok: true });
}

export default withSessionRoute(logoutRoute);
