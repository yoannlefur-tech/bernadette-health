<?php

declare(strict_types=1);

namespace App\Tests\Api;

use PHPUnit\Framework\Attributes\DataProvider;

final class OpenApiTest extends ApiResourceTestCase
{
    /** @return array<string, mixed> */
    private function documentation(): array
    {
        $response = $this->client->request('GET', '/api/docs.jsonopenapi', [
            'headers' => ['Accept' => 'application/vnd.openapi+json'],
        ]);
        self::assertResponseIsSuccessful();

        return $response->toArray();
    }

    /** @return iterable<string, array{string, list<string>}> */
    public static function collections(): iterable
    {
        yield 'dogs' => ['/api/dogs', ['birth_date[after]', 'order[birth_date]']];
        yield 'weight_entries' => ['/api/weight_entries', ['dog', 'measured_at[after]', 'order[measured_at]']];
        yield 'vaccinations' => [
            '/api/vaccinations',
            ['dog', 'administered_at[after]', 'next_due_at[before]', 'order[administered_at]'],
        ];
        yield 'vet_visits' => ['/api/vet_visits', ['dog', 'visited_at[after]', 'order[visited_at]']];
    }

    /** @param list<string> $expected_filters */
    #[DataProvider('collections')]
    public function testResourceAndFiltersAreDocumented(string $path, array $expected_filters): void
    {
        $paths = $this->documentation()['paths'];

        self::assertArrayHasKey($path, $paths);
        $filters = array_column($paths[$path]['get']['parameters'], 'name');
        foreach ($expected_filters as $filter) {
            self::assertContains($filter, $filters);
        }
    }

    public function testCalendarDatesAreDocumentedAsDates(): void
    {
        $schemas = $this->documentation()['components']['schemas'];

        $properties = $schemas['WeightEntry-weight_entry.write_weight_entry.create']['properties'];
        self::assertSame('date', $properties['measured_at']['format']);

        $properties = $schemas['Vaccination-vaccination.write_vaccination.create']['properties'];
        self::assertSame('date', $properties['next_due_at']['format']);
    }

    public function testDogCannotBeWrittenThroughPatch(): void
    {
        $schemas = $this->documentation()['components']['schemas'];

        self::assertArrayHasKey('dog', $schemas['WeightEntry-weight_entry.write_weight_entry.create']['properties']);
        self::assertArrayNotHasKey('dog', $schemas['WeightEntry-weight_entry.write.jsonMergePatch']['properties']);
    }
}
