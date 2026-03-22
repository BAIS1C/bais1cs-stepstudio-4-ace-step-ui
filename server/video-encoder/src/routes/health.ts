import { Router } from 'express';
import { EncoderInfo, getAllEncoders } from '../detect-gpu.js';

export function createHealthRouter(encoderInfo: EncoderInfo): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      encoder: encoderInfo.encoder,
      label: encoderInfo.label,
      gpu: encoderInfo.gpu,
      hardware: encoderInfo.hardware,
      uptime: process.uptime(),
    });
  });

  router.get('/capabilities', (_req, res) => {
    const encoders = getAllEncoders();
    res.json({
      active: encoderInfo,
      encoders,
    });
  });

  return router;
}
