<?php

declare(strict_types=1);

namespace App\DataFixtures;

use App\Entity\Dog;
use App\Entity\User;
use App\Entity\Vaccination;
use App\Entity\VetVisit;
use App\Entity\WeightEntry;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Development data. Every value is fictional.
 */
class AppFixtures extends Fixture
{
    public function __construct(
        private readonly UserPasswordHasherInterface $password_hasher,
        #[Autowire(env: 'default::DEV_USER_PASSWORD')]
        private readonly ?string $dev_user_password,
    ) {
    }

    public function load(ObjectManager $manager): void
    {
        if (null === $this->dev_user_password || '' === $this->dev_user_password) {
            throw new \LogicException('Set DEV_USER_PASSWORD in backend/.env.local to load the fixtures.');
        }

        $owner = (new User())->setEmail('dev@example.com');
        $owner->setPassword($this->password_hasher->hashPassword($owner, $this->dev_user_password));
        $manager->persist($owner);

        $bernadette = (new Dog())
            ->setName('Bernadette')
            ->setBirthDate(new \DateTimeImmutable('2022-03-14'))
            ->setBreed('Teckel nain')
            ->setCoat('Poil ras, fauve')
            ->addOwner($owner);
        $manager->persist($bernadette);

        $weights = [
            '2022-06-15' => 1850,
            '2022-12-10' => 3400,
            '2023-06-20' => 3950,
            '2024-01-18' => 4100,
            '2025-02-05' => 4250,
            '2026-03-10' => 4180,
        ];
        foreach ($weights as $measured_at => $weight_grams) {
            $manager->persist(
                (new WeightEntry())
                    ->setDog($bernadette)
                    ->setMeasuredAt(new \DateTimeImmutable($measured_at))
                    ->setWeightGrams($weight_grams)
            );
        }

        $vaccinations = [
            ['CHPPi', '2022-05-20', '2023-05-20', null],
            ['Rage', '2022-06-15', '2023-06-15', 'Avant le premier voyage.'],
            ['CHPPiL', '2025-02-05', '2026-02-05', null],
            ['Rage', '2026-03-10', '2027-03-10', null],
        ];
        foreach ($vaccinations as [$name, $administered_at, $next_due_at, $notes]) {
            $manager->persist(
                (new Vaccination())
                    ->setDog($bernadette)
                    ->setName($name)
                    ->setAdministeredAt(new \DateTimeImmutable($administered_at))
                    ->setNextDueAt(new \DateTimeImmutable($next_due_at))
                    ->setVeterinarian('Dr Exemple')
                    ->setNotes($notes)
            );
        }

        $visits = [
            ['2023-06-20', 'Contrôle annuel', 'RAS', 4500, null],
            ['2024-09-02', 'Boiterie antérieure droite', 'Entorse légère', 6800, 'Repos 10 jours, éviter les escaliers.'],
            ['2026-03-10', 'Contrôle annuel et détartrage', null, null, null],
        ];
        foreach ($visits as [$visited_at, $reason, $diagnosis, $cost_cents, $notes]) {
            $manager->persist(
                (new VetVisit())
                    ->setDog($bernadette)
                    ->setVisitedAt(new \DateTimeImmutable($visited_at))
                    ->setReason($reason)
                    ->setDiagnosis($diagnosis)
                    ->setCostCents($cost_cents)
                    ->setNotes($notes)
            );
        }

        $manager->flush();
    }
}
