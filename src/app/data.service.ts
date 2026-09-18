import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, shareReplay } from 'rxjs';

export interface Pokemon {
  id: number;
  name: string;
  types: Array<{
    slot: number;
    type: {
      name: string;
      url: string;
    };
  }>;
  sprites: {
    front_default: string | null;
    other?: {
      ['official-artwork']?: {
        front_default: string | null;
      };
    };
  };
  abilities?: Array<{ ability: { name: string } }>;
  height?: number;
  weight?: number;
  stats?: Array<{ base_stat: number; stat: { name: string } }>;
  species?: { name: string; url: string };
}

export interface PokemonSpecies {
  names: Array<{
    name: string;
    language: {
      name: string;
    };
  }>;
  generation?: { name: string };
  genera?: Array<{ genus: string; language: { name: string } }>;
  flavor_text_entries?: Array<{
    flavor_text: string;
    language: { name: string };
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private readonly apiUrl = 'https://pokeapi.co/api/v2';
  private readonly pokemonCache = new Map<number, Observable<Pokemon>>();
  private readonly speciesCache = new Map<number, Observable<PokemonSpecies>>();

  constructor(private http: HttpClient) {}

  getPokemon(id: number): Observable<Pokemon> {
    if (!this.pokemonCache.has(id)) {
      this.pokemonCache.set(
        id,
        this.http.get<Pokemon>(`${this.apiUrl}/pokemon/${id}`).pipe(shareReplay(1)),
      );
    }
    return this.pokemonCache.get(id)!;
  }

  getPokemonSpecies(id: number): Observable<PokemonSpecies> {
    if (!this.speciesCache.has(id)) {
      this.speciesCache.set(
        id,
        this.http
          .get<PokemonSpecies>(`${this.apiUrl}/pokemon-species/${id}`)
          .pipe(shareReplay(1)),
      );
    }
    return this.speciesCache.get(id)!;
  }

  getJapanesePokemonNames(
    pokemon: Pokemon[],
  ): Observable<Record<number, string>> {
    return forkJoin(
      pokemon.map((item) =>
        this.getPokemonSpecies(item.id).pipe(
          map((species) => [
            item.id,
            species.names.find((entry) => entry.language.name === 'ja')?.name ??
              'ポケモン',
          ] as const),
        ),
      ),
    ).pipe(map((entries) => Object.fromEntries(entries)));
  }

  private formatPokemonName(name: string): string {
    return name.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
  }
}
