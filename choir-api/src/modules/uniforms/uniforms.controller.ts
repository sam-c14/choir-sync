import { logger } from '../../lib/logger';
import { Request, Response } from 'express';
import { CreateUniformSchema, UpdateUniformSchema } from '@choir-workspace/shared-validation';
import { uniformsService } from './uniforms.service';
import { supabaseAdmin } from '../../lib/supabase';
import { handleControllerError, sendError } from '../../lib/errors';
import crypto from 'crypto';

export class UniformsController {
  async getUploadUrl(req: Request, res: Response) {
    try {
      const filename = req.body.filename || 'image.jpg';
      const path = `inspos/${Date.now()}-${crypto.randomUUID()}-${filename}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from('uniform-inspos')
        .createSignedUploadUrl(path);

      if (error || !data) {
        logger.error('Supabase signed URL error:', error);
        return sendError(res, 500, 'Failed to generate upload URL');
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('uniform-inspos')
        .getPublicUrl(path);

      res.status(200).json({
        signedUrl: data.signedUrl,
        publicUrl: publicUrlData.publicUrl,
      });
    } catch (error: any) {
      return handleControllerError(res, error, 'Failed to generate upload URL', req);
    }
  }

  async getUniforms(req: Request, res: Response) {
    try {
      const filter = (req.query.filter as string) || 'current';
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const fromDate = req.query.from as string | undefined;
      const toDate = req.query.to as string | undefined;
      const clientToday = req.query.clientToday as string | undefined;
      const uniforms = await uniformsService.getUniforms(filter, page, limit, fromDate, toDate, clientToday);
      res.json(uniforms);
    } catch (error: any) {
      return handleControllerError(res, error, 'Failed to fetch uniforms', req);
    }
  }

  async createUniform(req: Request, res: Response) {
    try {
      const dto = CreateUniformSchema.parse(req.body);
      const uniform = await uniformsService.createUniform(dto);
      res.status(201).json(uniform);
    } catch (error: any) {
      return handleControllerError(res, error, 'Failed to create uniform', req);
    }
  }

  async updateUniform(req: Request, res: Response) {
    try {
      const dto = UpdateUniformSchema.parse(req.body);
      const uniform = await uniformsService.updateUniform(req.params.id as string, dto);
      res.status(200).json(uniform);
    } catch (error: any) {
      return handleControllerError(res, error, 'Failed to update uniform', req);
    }
  }

  async deleteUniform(req: Request, res: Response) {
    try {
      await uniformsService.deleteUniform(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      return handleControllerError(res, error, 'Failed to delete uniform', req);
    }
  }
}

export const uniformsController = new UniformsController();
