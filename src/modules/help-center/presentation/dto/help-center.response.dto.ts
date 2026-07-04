import {
  HelpTicketPriority,
  HelpTicketStatus,
  HelpTicketUserType,
} from '@prisma/client';

export class HelpTicketResponseDto {
  id!: string;
  userId!: string;
  customerId?: string | null;
  vendorId?: string | null;
  userType!: HelpTicketUserType;
  subject?: string | null;
  message!: string;
  status!: HelpTicketStatus;
  priority!: HelpTicketPriority;
  adminReply?: string | null;
  repliedAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  createdAt!: Date;
}
