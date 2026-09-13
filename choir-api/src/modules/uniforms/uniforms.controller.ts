import { Request, Response } from 'express';
import { CreateUniformSchema, UpdateUniformSchema } from '@choir-workspace/shared-validation';
import { uniformsService } from './uniforms.service';

export class UniformsController {
  async getUniforms(req: Request, res: Response) {
    try {
      const filter = (req.query.filter as string) || 'current';
      const uniforms = await uniformsService.getUniforms(filter);
      res.json(uniforms);
    } catch (error: any) {
      res.status(500).json({ message: 'Failed to fetch uniforms' });
    }
  }

  async createUniform(req: Request, res: Response) {
    try {
      const dto = CreateUniformSchema.parse(req.body);
      const uniform = await uniformsService.createUniform(dto);
      res.status(201).json(uniform);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
      res.status(500).json({ error: error.message });
    }
  }

  async updateUniform(req: Request, res: Response) {
    try {
      const dto = UpdateUniformSchema.parse(req.body);
      const uniform = await uniformsService.updateUniform(req.params.id as string, dto);
      res.status(200).json(uniform);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
      if (error.code === 'P2025') return res.status(404).json({ error: 'Uniform not found' });
      res.status(500).json({ error: error.message });
    }
  }

  async deleteUniform(req: Request, res: Response) {
    try {
      await uniformsService.deleteUniform(req.params.id as string);
      res.status(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') return res.status(404).json({ error: 'Uniform not found' });
      res.status(500).json({ error: error.message });
    }
  }
}

export const uniformsController = new UniformsController();
