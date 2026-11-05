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

    public function testAuthenticationRoutesAreDocumentedAsPublic(): void
    {
        $paths = $this->documentation()['paths'];

        foreach (['/api/auth/login', '/api/auth/refresh', '/api/auth/logout'] as $path) {
            self::assertArrayHasKey($path, $paths);
            self::assertArrayHasKey('post', $paths[$path]);
            self::assertSame([], $paths[$path]['post']['security']);
        }
    }

    public function testLoginDocumentsTheEmailField(): void
    {
        $paths = $this->documentation()['paths'];

        $schema = $paths['/api/auth/login']['post']['requestBody']['content']['application/json']['schema'];
        self::assertEqualsCanonicalizing(['email', 'password'], array_keys($schema['properties']));
    }

    public function testBearerSecuritySchemeIsDocumentedAndRequiredByDefault(): void
    {
        $documentation = $this->documentation();

        $scheme = $documentation['components']['securitySchemes']['Bearer'];
        self::assertSame('http', $scheme['type']);
        self::assertSame('bearer', $scheme['scheme']);
        self::assertSame('JWT', $scheme['bearerFormat']);
        self::assertContains(['Bearer' => []], $documentation['security']);
    }

    public function testCurrentUserIsDocumentedButNeverItsPassword(): void
    {
        $documentation = $this->documentation();

        self::assertArrayHasKey('/api/me', $documentation['paths']);
        self::assertArrayNotHasKey('/api/users/{id}', $documentation['paths']);
        self::assertStringNotContainsString('password', json_encode($documentation['components']['schemas'], \JSON_THROW_ON_ERROR));
    }
}
