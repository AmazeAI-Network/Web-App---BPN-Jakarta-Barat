<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('backup_runs')) {
            return;
        }
        Schema::create('backup_runs', function (Blueprint $t) {
            $t->id();
            $t->string('type', 32);            // full | snapshot | prune
            $t->string('destination', 32);     // local | s3
            $t->string('status', 16);          // running | success | failed
            $t->string('artifact')->nullable();
            $t->unsignedBigInteger('bytes')->default(0);
            $t->text('message')->nullable();
            $t->timestamp('started_at')->nullable();
            $t->timestamp('finished_at')->nullable();
            $t->timestamps();
            $t->index(['type', 'destination', 'finished_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_runs');
    }
};
