<?php

namespace App\Models\Traits;

use DateTimeInterface;
use DateTimeZone;

trait SerializesDatesToBoliviaTime
{
    /**
     * Prepare a date for array / JSON serialization in Bolivia timezone (America/La_Paz).
     */
    protected function serializeDate(DateTimeInterface $date): string
    {
        return $date->setTimezone(new DateTimeZone('America/La_Paz'))->format('Y-m-d H:i:s');
    }
}
