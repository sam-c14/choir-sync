import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { supabaseAdmin } from '../../lib/supabase';
import { CreateVoiceSnippetSchema } from '@choir-workspace/shared-validation';
import { handleControllerError, sendError } from '../../lib/errors';

const BUCKET_NAME = process.env.SUPABASE_BUCKET_STORAGE_NAME || 'choir-tracker-dev-bucket';

class SnippetsController {
  async getUploadUrl(req: Request, res: Response) {
    try {
      const partId = req.params.partId as string;
      const userId = req.user!.id;
      
      const songPart = await prisma.songPart.findUnique({ where: { id: partId } });
      if (!songPart) {
        return sendError(res, 404, 'Song part not found');
      }

      const filePath = `snippets/${partId}/${Date.now()}-${userId}.webm`;
      
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUploadUrl(filePath);

      if (error || !data) {
        console.error('Supabase signed URL error:', error);
        return sendError(res, 500, 'Failed to generate upload URL');
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
      return handleControllerError(res, error, 'Failed to generate upload URL');
    }
  }

  async createSnippet(req: Request, res: Response) {
    try {
      const partId = req.params.partId as string;
      const userId = req.user!.id;
      const data = CreateVoiceSnippetSchema.parse(req.body);

      const songPart = await prisma.songPart.findUnique({ where: { id: partId } });
      if (!songPart) {
        return sendError(res, 404, 'Song part not found');
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
      return handleControllerError(res, error, 'Failed to create voice snippet');
    }
  }

  async updateSnippet(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const { title } = req.body;

      if (!title || typeof title !== 'string') {
        return sendError(res, 400, 'Valid title is required');
      }

      const snippet = await prisma.voiceSnippet.findUnique({ where: { id } });
      if (!snippet) {
        return sendError(res, 404, 'Snippet not found');
      }

      if (snippet.userId !== userId && userRole !== 'DIRECTOR') {
        return sendError(res, 403, 'You do not have permission to edit this snippet');
      }

      const updated = await prisma.voiceSnippet.update({
        where: { id },
        data: { title },
        include: { user: { select: { id: true, email: true, role: true } } }
      });

      res.json(updated);
    } catch (error) {
      return handleControllerError(res, error, 'Failed to update snippet');
    }
  }

  async deleteSnippet(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const snippet = await prisma.voiceSnippet.findUnique({ where: { id } });
      if (!snippet) {
        return sendError(res, 404, 'Snippet not found');
      }

      // Only creator or DIRECTOR can delete
      if (snippet.userId !== userId && userRole !== 'DIRECTOR') {
        return sendError(res, 403, 'You do not have permission to delete this snippet');
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

      const parentPart = await prisma.songPart.findUnique({
        where: { id: snippet.songPartId },
        include: { voiceSnippets: true }
      });
      if (parentPart && parentPart.voiceSnippets.length === 0 && !parentPart.notes) {
        await prisma.songPart.delete({ where: { id: parentPart.id } });
      }

      res.json({ message: 'Snippet deleted' });
    } catch (error) {
      return handleControllerError(res, error, 'Failed to delete snippet');
    }
  }
}

export const snippetsController = new SnippetsController();
