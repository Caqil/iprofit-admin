import 'package:hive/hive.dart';
import 'package:json_annotation/json_annotation.dart';

part 'emi_calculation.g.dart';

@HiveType(typeId: 10)
@JsonSerializable()
class EmiCalculation extends HiveObject {
  @HiveField(0)
  final double loanAmount;

  @HiveField(1)
  final double interestRate;

  @HiveField(2)
  final int tenure;

  @HiveField(3)
  final double emiAmount;

  @HiveField(4)
  final double totalAmount;

  @HiveField(5)
  final double totalInterest;

  @HiveField(6)
  final List<EmiSchedule> schedule;

  EmiCalculation({
    required this.loanAmount,
    required this.interestRate,
    required this.tenure,
    required this.emiAmount,
    required this.totalAmount,
    required this.totalInterest,
    required this.schedule,
  });

  factory EmiCalculation.fromJson(Map<String, dynamic> json) =>
      _$EmiCalculationFromJson(json);
  Map<String, dynamic> toJson() => _$EmiCalculationToJson(this);
}

@HiveType(typeId: 11)
@JsonSerializable()
class EmiSchedule extends HiveObject {
  @HiveField(0)
  final int month;

  @HiveField(1)
  final double emi;

  @HiveField(2)
  final double principal;

  @HiveField(3)
  final double interest;

  @HiveField(4)
  final double balance;

  @HiveField(5)
  final DateTime? dueDate;

  @HiveField(6)
  final String status;

  @HiveField(7)
  final DateTime? paidDate;

  EmiSchedule({
    required this.month,
    required this.emi,
    required this.principal,
    required this.interest,
    required this.balance,
    this.dueDate,
    this.status = 'pending',
    this.paidDate,
  });

  factory EmiSchedule.fromJson(Map<String, dynamic> json) =>
      _$EmiScheduleFromJson(json);
  Map<String, dynamic> toJson() => _$EmiScheduleToJson(this);

  bool get isPending => status.toLowerCase() == 'pending';
  bool get isPaid => status.toLowerCase() == 'paid';
  bool get isOverdue => status.toLowerCase() == 'overdue';
}
