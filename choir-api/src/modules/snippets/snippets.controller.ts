import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { supabaseAdmin } from '../../lib/supabase';
import { CreateVoiceSnippetSchema } from '@choir-workspace/shared-validation';

const BUCKET_NAME = process.env.SUPABASE_BUCKET_STORAGE_NAME || 'choir-tracker-dev-bucket';

class SnippetsController {
  async getUploadUrl(req: Request, res: Response) {
    try {
      const partId = req.params.partId as string;
      const userId = req.user!.id;
      
      const songPart = await prisma.songPart.findUnique({ where: { id: partId } });
      if (!songPart) {
        return res.status(404).json({ error: 'Song part not found' });
      }

      const filePath = `snippets/${partId}/${Date.now()}-${userId}.webm`;
      
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUploadUrl(filePath);

      if (error || !data) {
        console.error('Supabase signed URL error:', error);
        return res.status(500).json({ error: 'Failed to generate upload URL' });
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      res.json({
        signedUrl: data.signedUrl,
        path: data.path,
        publicUrl: publicUrlData.publicUrl
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createSnippet(req: Request, res: Response) {
    try {
      const partId = req.params.partId as string;
      const userId = req.user!.id;
      const data = CreateVoiceSnippetSchema.parse(req.body);

      const songPart = await prisma.songPart.findUnique({ where: { id: partId } });
      if (!songPart) {
        return res.status(404).json({ error: 'Song part not found' });
      }

      const snippet = await prisma.voiceSnippet.create({
        data: {
          songPartId: partId,
          userId,
          audioUrl: data.audioUrl,
          durationSec: data.durationSec,
          title: data.title
        },
        include: { user: { select: { id: true, email: true, role: true } } }
      });

      res.status(201).json(snippet);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteSnippet(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const snippet = await prisma.voiceSnippet.findUnique({ where: { id } });
      if (!snippet) {
        return res.status(404).json({ error: 'Snippet not found' });
      }

      // Only creator or DIRECTOR can delete
      if (snippet.userId !== userId && userRole !== 'DIRECTOR') {
        return res.status(403).json({ error: 'Not authorized to delete this snippet' });
      }

      // Delete from Supabase Storage
      try {
        const urlObj = new URL(snippet.audioUrl);
        const pathParts = urlObj.pathname.split(`/${BUCKET_NAME}/`);
        if (pathParts.length > 1) {
          const filePath = pathParts[1];
          await supabaseAdmin.storage.from(BUCKET_NAME).remove([filePath]);
        }
      } catch (err) {
        console.error('Failed to remove from storage:', err);
        // Continue to delete from DB even if storage cleanup fails
      }

      await prisma.voiceSnippet.delete({ where: { id } });

      res.json({ message: 'Snippet deleted' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const snippetsController = new SnippetsController();
