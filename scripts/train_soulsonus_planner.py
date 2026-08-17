#!/usr/bin/env python3
"""
SoulSonus Execution Planner Unsloth Fine-Tuning Script (train_soulsonus_planner.py)
Fine-tunes a 3B/4B compact LLM (Qwen2.5/3 or Llama-3.2) in ~20-30 minutes using 4-bit QLoRA.
"""

import os
import torch
from datasets import load_dataset
from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments

def main():
    print("==================================================================")
    print("  SoulSonus Execution Planner — Unsloth LoRA Fine-Tuning Pipeline ")
    print("==================================================================")

    # 1. Training Parameters
    max_seq_length = 2048
    dtype = None # Auto-detects bfloat16 / float16
    load_in_4bit = True # 4bit QLoRA for 70% VRAM reduction

    # Base Model Selection
    model_name = os.getenv("SOULSONUS_BASE_MODEL", "unsloth/Qwen2.5-Coder-3B-Instruct")
    output_dir = "outputs/soulsonus_planner_lora"
    gguf_dir = "outputs/soulsonus_planner_gguf"

    print(f"Loading Base Model: {model_name} (in 4-bit)...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=model_name,
        max_seq_length=max_seq_length,
        dtype=dtype,
        load_in_4bit=load_in_4bit,
    )

    # 2. Add LoRA Adapters
    print("Configuring LoRA Rank=16 Adapters...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=16,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_alpha=16,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407,
    )

    # 3. Format SoulSonus Training Data
    SYSTEM_PROMPT = """You are the SoulSonus Execution Planner.
Translate the creator's intent and session state into a strict, valid JSON MusicExecutionPlan.
Do not output conversational filler. Output ONLY the JSON object."""

    def formatting_prompts_func(examples):
        instructions = examples["creator_request"]
        contexts = examples["session_context"]
        outputs = examples["ground_truth_plan"]
        
        texts = []
        for instruction, context, output in zip(instructions, contexts, outputs):
            prompt = (
                f"<|im_start|>system\n{SYSTEM_PROMPT}<|im_end|>\n"
                f"<|im_start|>user\nDAW Context: {json.dumps(context)}\nRequest: {instruction}<|im_end|>\n"
                f"<|im_start|>assistant\n{output}<|im_end|>"
            )
            texts.append(prompt)
        return {"text": texts}

    print("Loading dataset/soulsonus_train.json and dataset/soulsonus_val.json...")
    train_dataset = load_dataset("json", data_files="dataset/soulsonus_train.json", split="train")
    val_dataset = load_dataset("json", data_files="dataset/soulsonus_val.json", split="train")

    train_dataset = train_dataset.map(formatting_prompts_func, batched=True)
    val_dataset = val_dataset.map(formatting_prompts_func, batched=True)

    # 4. Configure SFT Trainer
    print("Initializing SFT Trainer...")
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        dataset_text_field="text",
        max_seq_length=max_seq_length,
        dataset_num_proc=2,
        packing=False,
        args=TrainingArguments(
            per_device_train_batch_size=4,
            gradient_accumulation_steps=2,
            warmup_steps=15,
            max_steps=400, # ~3 epochs over 1,800 examples
            learning_rate=2e-4,
            fp16=not torch.cuda.is_bf16_supported(),
            bf16=torch.cuda.is_bf16_supported(),
            logging_steps=10,
            evaluation_strategy="steps",
            eval_steps=50,
            output_dir=output_dir,
            optim="adamw_8bit",
            seed=3407,
            report_to="none",
        ),
    )

    # 5. Train
    print("Starting Training (Estimated time: ~20-30 mins on single GPU)...")
    trainer.train()

    # 6. Export to 4-bit GGUF for Ollama / llama.cpp
    print("Exporting Model to 4-bit GGUF (Q4_K_M)...")
    os.makedirs(gguf_dir, exist_ok=True)
    model.save_pretrained_gguf(
        gguf_dir,
        tokenizer,
        quantization_method="q4_k_m"
    )
    print(f"==================================================================")
    print(f"  Training Complete! Model exported to: {gguf_dir}")
    print(f"==================================================================")

if __name__ == "__main__":
    main()
