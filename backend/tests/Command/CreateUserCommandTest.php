<?php

declare(strict_types=1);

namespace App\Tests\Command;

use App\Entity\User;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class CreateUserCommandTest extends KernelTestCase
{
    private const PASSWORD = 'correct horse battery staple';

    private CommandTester $tester;

    protected function setUp(): void
    {
        $application = new Application(self::bootKernel());
        $this->tester = new CommandTester($application->find('app:create-user'));
    }

    private function findUser(string $email): ?User
    {
        return self::getContainer()->get(UserRepository::class)->loadUserByIdentifier($email);
    }

    public function testCreatesUserWithHashedPassword(): void
    {
        $this->tester->setInputs([self::PASSWORD]);

        self::assertSame(Command::SUCCESS, $this->tester->execute(['email' => 'Yoann@Example.com']));

        $user = $this->findUser('yoann@example.com');
        self::assertNotNull($user);
        self::assertSame('yoann@example.com', $user->getEmail());
        self::assertSame(['ROLE_USER'], $user->getRoles());
        self::assertNotSame(self::PASSWORD, $user->getPassword());
        self::assertTrue(
            self::getContainer()->get(UserPasswordHasherInterface::class)->isPasswordValid($user, self::PASSWORD),
        );
        self::assertStringNotContainsString(self::PASSWORD, $this->tester->getDisplay());
    }

    public function testAdminOptionGrantsAdminRole(): void
    {
        $this->tester->setInputs([self::PASSWORD]);

        self::assertSame(Command::SUCCESS, $this->tester->execute(['email' => 'admin@example.com', '--admin' => true]));

        self::assertEqualsCanonicalizing(['ROLE_ADMIN', 'ROLE_USER'], $this->findUser('admin@example.com')?->getRoles());
    }

    public function testDuplicateEmailIsRefusedWhateverItsCase(): void
    {
        $this->tester->setInputs([self::PASSWORD]);
        self::assertSame(Command::SUCCESS, $this->tester->execute(['email' => 'yoann@example.com']));

        $this->tester->setInputs([self::PASSWORD]);

        self::assertSame(Command::FAILURE, $this->tester->execute(['email' => 'YOANN@example.com']));
    }

    public function testInvalidEmailIsRefused(): void
    {
        $this->tester->setInputs([self::PASSWORD]);

        self::assertSame(Command::FAILURE, $this->tester->execute(['email' => 'not-an-email']));
        self::assertNull($this->findUser('not-an-email'));
    }

    public function testEmptyPasswordIsRefused(): void
    {
        $this->tester->setInputs(['']);

        self::assertSame(Command::FAILURE, $this->tester->execute(['email' => 'yoann@example.com']));
        self::assertNull($this->findUser('yoann@example.com'));
    }
}
