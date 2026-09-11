import { ApiClient, unwrap } from '@/app/apiClient';
import { Paradigm } from './types';

export class GrammarService {
  constructor(private readonly apiClient: ApiClient) {}

  // Прэфіксны пошук па леме і словаформах; вынік - цэлыя парадыгмы разам з формамі
  async searchParadigms(query: string): Promise<Paradigm[]> {
    return unwrap(
      await this.apiClient.get<Paradigm[]>(
        `/grammar/paradigms?query=${encodeURIComponent(query)}`
      )
    );
  }
}
