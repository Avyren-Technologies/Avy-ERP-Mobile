import { View, Text } from 'react-native';

interface BomIssueCounterProps {
  bomRequired: number;
  cumulativeIssued: number;
  remaining: number;
  compact?: boolean;
}

export function BomIssueCounter({
  bomRequired,
  cumulativeIssued,
  remaining,
  compact = false,
}: BomIssueCounterProps) {
  const total = bomRequired || 1;
  const issuedPct = Math.min((cumulativeIssued / total) * 100, 100);
  const isOverIssued = cumulativeIssued > bomRequired;

  return (
    <View style={{ gap: 4 }}>
      {/* Progress bar */}
      <View style={{ width: '100%', height: 6, backgroundColor: '#e5e5e5', borderRadius: 3, overflow: 'hidden' }}>
        <View
          style={{
            height: '100%',
            borderRadius: 3,
            backgroundColor: isOverIssued ? '#f59e0b' : '#10b981',
            width: `${Math.min(issuedPct, 100)}%`,
          }}
        />
      </View>

      {/* Labels */}
      {!compact ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text className="text-[10px] font-inter text-neutral-500">
            <Text className="font-semibold text-emerald-600 font-inter">{Number(cumulativeIssued).toLocaleString()}</Text>
            {' / '}
            <Text className="font-medium font-inter">{Number(bomRequired).toLocaleString()}</Text>
            {' issued'}
          </Text>
          <Text
            className={`text-[10px] font-semibold font-inter ${
              remaining > 0
                ? 'text-neutral-600'
                : isOverIssued
                  ? 'text-amber-600'
                  : 'text-emerald-600'
            }`}
          >
            {remaining > 0
              ? `${Number(remaining).toLocaleString()} remaining`
              : isOverIssued
                ? `Over-issued by ${Number(cumulativeIssued - bomRequired).toLocaleString()}`
                : 'Fully issued'}
          </Text>
        </View>
      ) : (
        <Text className="text-[10px] font-inter text-neutral-500">
          <Text className="font-semibold text-emerald-600 font-inter">{Number(cumulativeIssued).toLocaleString()}</Text>
          {' / '}
          {Number(bomRequired).toLocaleString()}
        </Text>
      )}
    </View>
  );
}
