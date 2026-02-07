import { CreateUserDto } from '../../users/dto/create-user.dto';

// Sign up uses the same validation as CreateUserDto
export class SignUpDto extends CreateUserDto {}
