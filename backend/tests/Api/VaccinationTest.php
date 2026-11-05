<?php

declare(strict_types=1);

namespace App\Tests\Api;

final class VaccinationTest extends ApiResourceTestCase
{
    /** @param array<string, mixed> $overrides */
    private function createVaccination(string $dog, array $overrides = []): string
    {
        $response = $this->post('/api/vaccinations', $overrides + [
            'dog' => $dog,
            'name' => 'CHPPiL',
            'administered_at' => '2024-01-15',
        ]);
        self::assertResponseStatusCodeSame(201);

        return $response->toArray()['@id'];
    }

    public function testCrud(): void
    {
        $dog = $this->createDog();

        $response = $this->post('/api/vaccinations', [
            'dog' => $dog,
            'name' => 'Rage',
            'administered_at' => '2024-01-15',
            'next_due_at' => '2025-01-15',
            'veterinarian' => 'Dr Martin',
            'notes' => 'RAS',
        ]);
        self::assertResponseStatusCodeSame(201);
        $vaccination = $response->toArray();
        self::assertSame($dog, $vaccination['dog']);
        self::assertSame('2025-01-15', $vaccination['next_due_at']);
        self::assertNotEmpty($vaccination['created_at']);

        $iri = $vaccination['@id'];
        self::assertSame('Rage', $this->get($iri)->toArray()['name']);
        self::assertContains($iri, $this->collectionValues('/api/vaccinations', '@id'));

        self::assertSame('Dr Durand', $this->patch($iri, ['veterinarian' => 'Dr Durand'])->toArray()['veterinarian']);

        $this->delete($iri);
        self::assertResponseStatusCodeSame(204);
    }

    public function testPatchCannotMoveVaccinationToAnotherDog(): void
    {
        $dog = $this->createDog();
        $iri = $this->createVaccination($dog);

        $this->patch($iri, ['dog' => $this->createDog(['name' => 'Marcel'])]);

        self::assertResponseIsSuccessful();
        self::assertSame($dog, $this->get($iri)->toArray()['dog']);
    }

    public function testMissingDogIsRejected(): void
    {
        $this->post('/api/vaccinations', ['name' => 'Rage', 'administered_at' => '2024-01-15']);

        self::assertResponseStatusCodeSame(422);
    }

    public function testNextDueDateMustBeAfterAdministrationDate(): void
    {
        $this->post('/api/vaccinations', [
            'dog' => $this->createDog(),
            'name' => 'Rage',
            'administered_at' => '2024-01-15',
            'next_due_at' => '2024-01-15',
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testNextDueDateCanBeInTheFuture(): void
    {
        $this->createVaccination($this->createDog(), ['next_due_at' => self::day('+1 year')]);

        self::assertResponseStatusCodeSame(201);
    }

    public function testFutureAdministrationDateIsRejected(): void
    {
        $this->post('/api/vaccinations', [
            'dog' => $this->createDog(),
            'name' => 'Rage',
            'administered_at' => self::day('+2 days'),
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testAdministrationDateBeforeBirthIsRejected(): void
    {
        $this->post('/api/vaccinations', [
            'dog' => $this->createDog(['birth_date' => '2022-03-14']),
            'name' => 'Rage',
            'administered_at' => '2022-03-13',
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testDeletingDogWithVaccinationReturnsConflict(): void
    {
        $dog = $this->createDog();
        $this->createVaccination($dog);

        $this->delete($dog);

        self::assertResponseStatusCodeSame(409);
    }

    public function testCollectionSortAndFilters(): void
    {
        $dog = $this->createDog();
        $other_dog = $this->createDog(['name' => 'Marcel']);
        $this->createVaccination($dog, ['administered_at' => '2024-01-01']);
        $this->createVaccination($dog, ['administered_at' => '2024-03-01', 'next_due_at' => '2025-03-01']);
        $this->createVaccination($other_dog, ['administered_at' => '2024-02-01']);

        self::assertSame(
            ['2024-03-01', '2024-02-01', '2024-01-01'],
            $this->collectionValues('/api/vaccinations', 'administered_at'),
        );
        self::assertSame(
            ['2024-03-01', '2024-01-01'],
            $this->collectionValues('/api/vaccinations?dog='.$dog, 'administered_at'),
        );
        self::assertSame(
            ['2024-03-01', '2024-02-01'],
            $this->collectionValues('/api/vaccinations?administered_at[after]=2024-02-01', 'administered_at'),
        );
        self::assertSame(
            ['2024-03-01'],
            $this->collectionValues('/api/vaccinations?next_due_at[before]=2025-12-31', 'administered_at'),
        );
    }
}
