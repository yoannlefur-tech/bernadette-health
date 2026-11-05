<?php

declare(strict_types=1);

namespace App\Serializer;

use Symfony\Component\Serializer\Normalizer\DateTimeNormalizer;

/**
 * Wire format of calendar dates (Doctrine "date_immutable" columns).
 */
final class ApiDate
{
    public const NORMALIZATION = [DateTimeNormalizer::FORMAT_KEY => 'Y-m-d'];

    /** "!" resets the time to midnight, otherwise createFromFormat() keeps the current time. */
    public const DENORMALIZATION = [DateTimeNormalizer::FORMAT_KEY => '!Y-m-d'];

    /**
     * Latest accepted date for an event that already happened. The server runs
     * in UTC, so "today" would reject the local date just after midnight in
     * France: one day of tolerance is accepted instead.
     */
    public const LATEST_PAST = 'tomorrow';
}
