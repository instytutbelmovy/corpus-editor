import { ApiClient } from '@/app/apiClient';
import { AuthService } from '@/app/auth/service';
import { DocumentService } from '@/app/docs/service';
import { GrammarService } from '@/app/grammar/service';
import { UserService } from '@/app/users/service';

// Апрацоўшчык 401 рэгіструецца ў pages/_app.tsx пры загрузцы модуля
let onUnauthorized: () => void = () => {};

const apiClient = new ApiClient(() => onUnauthorized());

export const serviceLocator = {
  apiClient,
  authService: new AuthService(apiClient),
  documentService: new DocumentService(apiClient),
  userService: new UserService(apiClient),
  grammarService: new GrammarService(apiClient),
  setUnauthorizedHandler(handler: () => void) {
    onUnauthorized = handler;
  },
};
