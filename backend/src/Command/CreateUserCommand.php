<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * There is no public registration: this command is the only way to create a
 * user. The password has no option on purpose, it would end up in the shell
 * history.
 */
#[AsCommand(name: 'app:create-user', description: 'Creates a user, the password is asked in a hidden prompt')]
final class CreateUserCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entity_manager,
        private readonly UserPasswordHasherInterface $password_hasher,
        private readonly ValidatorInterface $validator,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'Email of the user')
            ->addOption('admin', null, InputOption::VALUE_NONE, 'Grant ROLE_ADMIN');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);

        $user = (new User())->setEmail($input->getArgument('email'));
        if ($input->getOption('admin')) {
            $user->setRoles([User::ROLE_ADMIN]);
        }

        $violations = $this->validator->validate($user);
        if (\count($violations) > 0) {
            foreach ($violations as $violation) {
                $io->error($violation->getPropertyPath().': '.$violation->getMessage());
            }

            return Command::FAILURE;
        }

        $password = (string) $io->askHidden('Password');
        if ('' === $password) {
            $io->error('The password cannot be empty.');

            return Command::FAILURE;
        }

        $user->setPassword($this->password_hasher->hashPassword($user, $password));
        $this->entity_manager->persist($user);
        $this->entity_manager->flush();

        $io->success(\sprintf('User %s created.', $user->getUserIdentifier()));

        return Command::SUCCESS;
    }
}
