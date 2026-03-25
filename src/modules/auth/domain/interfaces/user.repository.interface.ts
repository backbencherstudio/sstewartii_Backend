import { User } from '../entities/user.entity';

export interface IUserRepository {

    findByEmail(email: string): Promise<User | null>;

    findById(id: string): Promise<User | null>

    create(user: User, roleType: 'USER' | 'VENDOR'): Promise<User>;

    updateRefreshToken(userId: string, refreshToken: string | null): Promise<void>

    getRefreshToken(userId: string): Promise<string | null>;

    update(userId: string, updateDate: Partial<User>): Promise<User>

}