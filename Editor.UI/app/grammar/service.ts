import { ApiClient, unwrap } from '@/app/apiClient';
import { Paradigm, ParadigmInput } from './types';

export class GrammarService {
  constructor(private readonly apiClient: ApiClient) {}

  async getParadigm(id: number): Promise<Paradigm> {
    return unwrap(
      await this.apiClient.get<Paradigm>(`/grammar/paradigms/${id}`)
    );
  }

  async createParadigm(input: ParadigmInput): Promise<Paradigm> {
    return unwrap(
      await this.apiClient.post<Paradigm>('/grammar/paradigms', input)
    );
  }

  async updateParadigm(id: number, input: ParadigmInput): Promise<Paradigm> {
    return unwrap(
      await this.apiClient.put<Paradigm>(`/grammar/paradigms/${id}`, input)
    );
  }

  async copyParadigm(id: number, input: ParadigmInput): Promise<Paradigm> {
    return unwrap(
      await this.apiClient.post<Paradigm>(
        `/grammar/paradigms/${id}/copy`,
        input
      )
    );
  }

  async setHidden(id: number, hidden: boolean): Promise<void> {
    unwrap(
      hidden
        ? await this.apiClient.post<void>(`/grammar/paradigms/${id}/hide`)
        : await this.apiClient.delete<void>(`/grammar/paradigms/${id}/hide`)
    );
  }

  // Прэфіксны пошук па леме і словаформах; вынік - цэлыя парадыгмы разам з формамі
  async searchParadigms(query: string): Promise<Paradigm[]> {
    return unwrap(
      await this.apiClient.get<Paradigm[]>(
        `/grammar/paradigms?query=${encodeURIComponent(query)}`
      )
    );
  }
}
