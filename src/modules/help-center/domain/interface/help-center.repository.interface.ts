import {
  HelpTicketPriority,
  HelpTicketStatus,
  HelpTicketUserType,
} from '@prisma/client';

export interface CreateHelpTicketInput {
  userId: string;
  customerId?: string | null;
  vendorId?: string | null;
  userType: HelpTicketUserType;
  subject?: string;
  message: string;
}

export interface HelpTicketView {
  id: string;

  userId: string;
  customerId: string | null;
  vendorId: string | null;

  userType: HelpTicketUserType;

  subject: string | null;
  message: string;

  status: HelpTicketStatus;
  priority: HelpTicketPriority;

  adminReply: string | null;
  repliedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;

  createdAt: Date;
}

export interface IHelpCenterRepository {
  createHelpTicket(data: CreateHelpTicketInput): Promise<HelpTicketView>;
}
