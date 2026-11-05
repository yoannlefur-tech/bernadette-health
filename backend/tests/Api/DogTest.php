<?php

declare(strict_types=1);

namespace App\Tests\Api;

final class DogTest extends ApiResourceTestCase
{
    public function testPostCreatesDog(): void
    {
        $response = $this->post('/api/dogs', [
            'name' => 'Bernadette',
            'birth_date' => '2022-03-14',
            'breed' => 'Teckel nain',
            'coat' => 'Poil ras, fauve',
            'microchip_number' => '250268500000001',
        ]);

        self::assertResponseStatusCodeSame(201);
        $dog = $response->toArray();
        self::assertSame('Bernadette', $dog['name']);
        self::assertSame('2022-03-14', $dog['birth_date']);
        self::assertSame('250268500000001', $dog['microchip_number']);
        self::assertMatchesRegularExpression('/^[0-9a-f]{8}-[0-9a-f]{4}-7/', $dog['id']);
        self::assertNotEmpty($dog['created_at']);
        self::assertNotEmpty($dog['updated_at']);
        self::assertArrayNotHasKey('birthDate', $dog);
    }

    public function testGetItemAndCollection(): void
    {
        $iri = $this->createDog();

        self::assertSame('Bernadette', $this->get($iri)->toArray()['name']);
        self::assertResponseIsSuccessful();
        self::assertContains($iri, $this->collectionValues('/api/dogs', '@id'));
    }

    public function testPatchUpdatesDog(): void
    {
        $iri = $this->createDog();

        $response = $this->patch($iri, ['coat' => 'Poil ras, fauve charbonné']);

        self::assertResponseIsSuccessful();
        self::assertSame('Poil ras, fauve charbonné', $response->toArray()['coat']);
        self::assertSame('Bernadette', $response->toArray()['name']);
    }

    public function testDeleteRemovesDogWithoutRecords(): void
    {
        $iri = $this->createDog();

        $this->delete($iri);

        self::assertResponseStatusCodeSame(204);
        $this->get($iri);
        self::assertResponseStatusCodeSame(404);
    }

    public function testTimestampsAreReadOnly(): void
    {
        $response = $this->post('/api/dogs', [
            'name' => 'Bernadette',
            'birth_date' => '2022-03-14',
            'breed' => 'Teckel nain',
            'coat' => 'Poil ras, fauve',
            'created_at' => '2000-01-01T00:00:00+00:00',
            'updated_at' => '2000-01-01T00:00:00+00:00',
        ]);
        self::assertResponseStatusCodeSame(201);
        $dog = $response->toArray();
        self::assertStringStartsNotWith('2000', $dog['created_at']);
        self::assertStringStartsNotWith('2000', $dog['updated_at']);

        $patched = $this->patch($dog['@id'], ['created_at' => '2000-01-01T00:00:00+00:00'])->toArray();
        self::assertSame($dog['created_at'], $patched['created_at']);
    }

    public function testRequiredFieldsAreValidated(): void
    {
        $this->post('/api/dogs', ['birth_date' => '2022-03-14']);

        self::assertResponseStatusCodeSame(422);
    }

    public function testBirthDateCannotBeInTheFuture(): void
    {
        $this->post('/api/dogs', [
            'name' => 'Bernadette',
            'birth_date' => self::day('+2 days'),
            'breed' => 'Teckel nain',
            'coat' => 'Poil ras, fauve',
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testMicrochipNumberIsUnique(): void
    {
        $this->createDog(['microchip_number' => '250268500000001']);

        $this->post('/api/dogs', [
            'name' => 'Marcel',
            'birth_date' => '2023-01-01',
            'breed' => 'Teckel',
            'coat' => 'Poil dur',
            'microchip_number' => '250268500000001',
        ]);

        self::assertResponseStatusCodeSame(422);
    }

    public function testSeveralDogsCanHaveNoMicrochip(): void
    {
        $this->createDog();
        $this->createDog(['name' => 'Marcel']);

        self::assertResponseStatusCodeSame(201);
    }

    public function testCollectionIsSortedByBirthDateDescendingByDefault(): void
    {
        $this->createDog(['name' => 'Oldest', 'birth_date' => '2015-01-01']);
        $this->createDog(['name' => 'Youngest', 'birth_date' => '2024-01-01']);
        $this->createDog(['name' => 'Middle', 'birth_date' => '2020-01-01']);

        self::assertSame(['Youngest', 'Middle', 'Oldest'], $this->collectionValues('/api/dogs', 'name'));
        self::assertSame(
            ['Oldest', 'Middle', 'Youngest'],
            $this->collectionValues('/api/dogs?order[birth_date]=asc', 'name'),
        );
    }

    public function testCollectionIsFilteredByBirthDate(): void
    {
        $this->createDog(['name' => 'Oldest', 'birth_date' => '2015-01-01']);
        $this->createDog(['name' => 'Youngest', 'birth_date' => '2024-01-01']);

        self::assertSame(['Youngest'], $this->collectionValues('/api/dogs?birth_date[after]=2020-01-01', 'name'));
    }
}
