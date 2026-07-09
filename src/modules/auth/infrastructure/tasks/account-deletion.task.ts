import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { IUserRepository } from '../../domain/interfaces/user.repository.interface';
import { MailService } from '@/common/mail/mail.service';

@Injectable()
export class AccountDeletionTask {
  private readonly logger = new Logger(AccountDeletionTask.name);

  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly mailService: MailService,
  ) {}

  // Run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleAccountDeletion() {
    this.logger.log('Starting account deletion check...');

    try {
      const now = new Date();

      // Find all users whose deletion schedule has passed
      const usersToDelete =
        await this.userRepository.findUsersScheduledForDeletion(now);

      if (usersToDelete.length === 0) {
        this.logger.log('No accounts scheduled for deletion.');
        return;
      }

      this.logger.log(
        `Found ${usersToDelete.length} accounts to delete permanently.`,
      );

      for (const user of usersToDelete) {
        try {
          // Send final notification email before deletion
          await this.sendDeletionNotification(user.email);

          // Permanently delete the user (soft delete with anonymization)
          await this.userRepository.permanentlyDeleteUser(user.id);

          this.logger.log(
            `✅ Account permanently deleted for user: ${user.id} (${user.email})`,
          );
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(
            `❌ Failed to delete account ${user.id}: ${errorMessage}`,
          );
          // Continue with next user even if one fails
        }
      }

      this.logger.log('Account deletion check completed.');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Account deletion task failed: ${errorMessage}`);
    }
  }

  private async sendDeletionNotification(email: string) {
    try {
      // Send a proper deletion notification email
      await this.mailService.sendAccountDeletionEmail(email);
      this.logger.log(`Deletion notification sent to ${email}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send deletion notification to ${email}: ${errorMessage}`,
      );
    }
  }
}
