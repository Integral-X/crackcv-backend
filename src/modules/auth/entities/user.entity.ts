import { BaseEntity } from '../../../shared/entities/base.entity';

/**
 * User entity representing a user in the system
 * Contains only business properties without validation or API decorators
 */
export class User extends BaseEntity {
  email: string;
  password: string;
  name?: string;
  refreshToken?: string;

  constructor() {
    super();
  }
}
