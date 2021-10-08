import { Request, Response, NextFunction } from 'express';

/**
 * Set cache headers
 * @param req
 * @param res
 * @param next
 */
export function noCache(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS') {
    // Cache options request
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Vary', 'origin');
  } else {
    // No cache for all other requests
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
}
