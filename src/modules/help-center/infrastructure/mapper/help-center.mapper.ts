import { Injectable } from '@nestjs/common';
import { HelpTicketResponseDto } from '../../presentation/dto/help-center.response.dto';
import type { HelpTicketView } from '../../domain/interface/help-center.repository.interface';

@Injectable()
export class HelpCenterMapper {
  toResponse(ticket: HelpTicketView): HelpTicketResponseDto {
    return {
      id: ticket.id,
      userId: ticket.userId,
      customerId: ticket.customerId,
      vendorId: ticket.vendorId,
      userType: ticket.userType,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      priority: ticket.priority,
      adminReply: ticket.adminReply,
      repliedAt: ticket.repliedAt,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      createdAt: ticket.createdAt,
    };
  }
}
