"""PDF pipeline configuration: paths and env-backed settings (read once)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def truthy_env(name: str, *, default_when_unset: bool | None = None) -> bool:
    raw = os.environ.get(name)
    if raw is None and default_when_unset is not None:
        return default_when_unset
    return str(raw or "").lower() in ("1", "true", "yes")


def export_mode_from_env() -> str:
    """full | exercises — matches previous PDF_EXPORT_MODE handling."""
    m = os.environ.get("PDF_EXPORT_MODE", "full").strip().lower()
    if m in ("exercises", "exercise", "filtered"):
        return "exercises"
    return "full"


def gpu_cache_clear_from_env() -> bool:
    if os.environ.get("GPU_CACHE_CLEAR") is None:
        return True
    return truthy_env("GPU_CACHE_CLEAR")


def chandra_batch_size_from_env() -> int:
    # Default stays conservative here; process_pdfs.py auto-tunes upward on large GPUs
    # when CHANDRA_BATCH_SIZE is not explicitly set.
    raw = os.environ.get("CHANDRA_BATCH_SIZE", "1").strip()
    try:
        n = int(raw)
    except ValueError:
        return 1
    return max(1, n)


def allow_cpu_from_env() -> bool:
    """Explicit escape hatch when CUDA is unavailable (dev machines). Set ALLOW_CPU=1."""
    return truthy_env("ALLOW_CPU")


def speed_preset_from_env() -> str:
    """
    PDF_SPEED_PRESET=fast|aggressive — lower default raster when CHANDRA_IMAGE_DPI /
    CHANDRA_MIN_PDF_IMAGE_DIM are not set (much faster OCR, slightly rougher layout on small text).
    Takes precedence over PDF_CONSERVE_VRAM when set to fast or aggressive.
    """
    p = os.environ.get("PDF_SPEED_PRESET", "").strip().lower()
    if p in ("fast", "aggressive"):
        return p
    return "none"


def _defaults_for_speed_preset(preset: str) -> tuple[str, str]:
    if preset == "aggressive":
        return "96", "640"
    if preset == "fast":
        return "108", "768"
    return "120", "768"  # RTX 4060 8GB: reduced from 144/896 to lower GPU heat & VRAM usage


def conserve_vram_from_env() -> bool:
    """
    PDF_CONSERVE_VRAM=1: when CHANDRA_IMAGE_DPI / CHANDRA_MIN_PDF_IMAGE_DIM are not set,
    use slightly lower raster settings (faster, less GPU RAM per page). Override anytime
    by setting those CHANDRA_* variables explicitly. Ignored when PDF_SPEED_PRESET is fast|aggressive.
    """
    return truthy_env("PDF_CONSERVE_VRAM")


def pdf_gc_every_from_env() -> int:
    """Run gc.collect() every N OCR pages (not every page) to avoid UI freezes. 0 = never (except PDF end)."""
    raw = os.environ.get("PDF_GC_EVERY", "16").strip()  # RTX 4060 8GB: 16 reduces GC pauses vs default 8
    try:
        n = int(raw)
    except ValueError:
        return 16
    return max(0, min(128, n))


def pdf_tqdm_mininterval_from_env() -> float:
    """Min seconds between tqdm redraws — lowers console overhead on Windows."""
    raw = os.environ.get("PDF_TQDM_MININTERVAL", "0.35").strip()
    try:
        x = float(raw)
    except ValueError:
        return 0.35
    return max(0.05, min(30.0, x))


def pdf_checkpoint_from_env() -> bool:
    """PDF_CHECKPOINT=0 disables per-batch .progress.json checkpoint files. Default: enabled.

    With checkpoints enabled, a restart will resume from the last completed batch instead
    of re-processing pages from the beginning.
    """
    raw = os.environ.get("PDF_CHECKPOINT")
    if raw is None:
        return True  # default: enabled
    return truthy_env("PDF_CHECKPOINT")


def _env_nonempty(name: str) -> str | None:
    v = os.environ.get(name)
    if v is None or str(v).strip() == "":
        return None
    return str(v).strip()


@dataclass(frozen=True)
class PipelineConfig:
    """Snapshot of paths and tunables for one run (from environment at load time)."""

    root_dir: Path
    input_dir: Path
    output_dir: Path
    torch_device_raw: str
    model_checkpoint: str
    chandra_method: str
    chandra_batch_size: int
    gpu_cache_clear: bool
    apply_highlights: bool
    export_mode: str
    strict_output: bool
    allow_cpu: bool
    chandra_speed_preset: str
    conserve_vram: bool
    chandra_image_dpi: str
    chandra_min_pdf_image_dim: str
    pdf_gc_every: int
    pdf_tqdm_mininterval: float
    checkpoint_enabled: bool

    @classmethod
    def from_env(cls, root_dir: Path) -> PipelineConfig:
        root = root_dir.resolve()
        preset = speed_preset_from_env()
        conserve = conserve_vram_from_env()

        if preset in ("fast", "aggressive"):
            def_dpi, def_min = _defaults_for_speed_preset(preset)
        elif conserve:
            def_dpi, def_min = "120", "768"
        else:
            def_dpi, def_min = _defaults_for_speed_preset("none")

        image_dpi = _env_nonempty("CHANDRA_IMAGE_DPI") or def_dpi
        min_dim = _env_nonempty("CHANDRA_MIN_PDF_IMAGE_DIM") or def_min

        return cls(
            root_dir=root,
            input_dir=root / "data_input",
            output_dir=root / "data_output",
            torch_device_raw=os.environ.get("TORCH_DEVICE", "cuda"),
            model_checkpoint=os.environ.get("MODEL_CHECKPOINT", "datalab-to/chandra-ocr-2"),
            chandra_method=os.environ.get("CHANDRA_METHOD", "hf").strip().lower() or "hf",
            chandra_batch_size=chandra_batch_size_from_env(),
            gpu_cache_clear=gpu_cache_clear_from_env(),
            apply_highlights=(
                truthy_env("APPLY_HIGHLIGHTS")
                if os.environ.get("APPLY_HIGHLIGHTS") is not None
                else True
            ),
            export_mode=export_mode_from_env(),
            strict_output=truthy_env("STRICT_OUTPUT"),
            allow_cpu=allow_cpu_from_env(),
            chandra_speed_preset=preset,
            conserve_vram=conserve,
            chandra_image_dpi=image_dpi,
            chandra_min_pdf_image_dim=min_dim,
            pdf_gc_every=pdf_gc_every_from_env(),
            pdf_tqdm_mininterval=pdf_tqdm_mininterval_from_env(),
            checkpoint_enabled=pdf_checkpoint_from_env(),
        )
