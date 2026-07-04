import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  CreateHelpTicketInput,
  HelpTicketView,
  IHelpCenterRepository,
} from '../../domain/interface/help-center.repository.interface';

@Injectable()
export class HelpCenterRepository implements IHelpCenterRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createHelpTicket(data: CreateHelpTicketInput): Promise<HelpTicketView> {
    return this.prisma.helpCenterTicket.create({
      data: {
        userId: data.userId,
        customerId: data.customerId ?? null,
        vendorId: data.vendorId ?? null,
        userType: data.userType,
        subject: data.subject,
        message: data.message,
      },
      select: {
        id: true,

        userId: true,
        customerId: true,
        vendorId: true,

        userType: true,

        subject: true,
        message: true,

        status: true,
        priority: true,

        adminReply: true,
        repliedAt: true,
        resolvedAt: true,
        closedAt: true,

        createdAt: true,
      },
    });
  }
}
