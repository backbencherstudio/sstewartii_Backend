import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IUserRepository } from '../../domain/interfaces/user.repository.interface';
import { User } from '../../domain/entities/user.entity';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class UserRepository implements IUserRepository {

  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role:true }
    });

    if (!user) return null;

    return UserMapper.toDomain(user);
  }

 async update(userId: string, updateData: Partial<User>): Promise<User> {
    
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleId: updateData.googleId,
        provider: updateData.provider,
        password: updateData.password,
        refreshToken: updateData.refreshToken,
      },
      
      include: { 
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        } 
      }
    });

    return UserMapper.toDomain(updatedUser);
  }

  async create(user: User): Promise<User> {

    const created = await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        password: user.password,

        googleId: user.googleId,   
        provider: user.provider,
        
        role: {
          connect: { name: 'USER' }
        } 
      },
      include: { role: true }
    });

   return UserMapper.toDomain(created);
  }

  async findById(id: string): Promise<User | null> {

    const user = await this.prisma.user.findUnique({
       where: { id },
       include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              }
            }
          }
        }
       }

       });

    if(!user) return null;

    return UserMapper.toDomain(user);
  }

  async getRefreshToken(userId: string): Promise<string | null>{

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { refreshToken: true },
    });

    if(!user || !user.refreshToken){
      return null;
    }
    
    return user.refreshToken;
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    
    await this.prisma.user.update({
      where: { id: userId},
      data: { refreshToken },
    });
  }
  
}