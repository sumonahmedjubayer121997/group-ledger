import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Balance } from "@/stores/expenseStore";
import { ArrowRight, DollarSign } from "lucide-react";
import { SettlementDialog } from "./SettlementDialog";

interface BalanceCardProps {
  balances: Balance[];
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ balances }) => {
  const [selectedBalance, setSelectedBalance] = useState<Balance | null>(null);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);

  const handleSettleUp = (balance: Balance) => {
    setSelectedBalance(balance);
    setIsSettlementOpen(true);
  };

  const handleCloseSettlement = () => {
    setIsSettlementOpen(false);
    setSelectedBalance(null);
  };

  if (balances.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-card-foreground">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span>Balances</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🎉</div>
            <p className="text-muted-foreground">All settled up!</p>
            <p className="text-sm text-muted-foreground/70">
              No pending balances
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-card-foreground">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span>Balances</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {balances.map((balance, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-border/50"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                    <span className="text-primary font-medium text-sm">
                      {balance.from.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium text-card-foreground">
                      {balance.from.name}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-card-foreground">
                      {balance.to.name}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-destructive">
                    ${balance.amount.toFixed(2)}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-1 text-xs border-green-500/30 text-green-500 hover:bg-green-500/10 hover:border-green-500/50 dark:border-green-400/30 dark:text-green-400 dark:hover:bg-green-400/10"
                    onClick={() => handleSettleUp(balance)}
                  >
                    Settle up
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedBalance && (
        <SettlementDialog
          isOpen={isSettlementOpen}
          onClose={handleCloseSettlement}
          fromMember={selectedBalance.from}
          toMember={selectedBalance.to}
          amount={selectedBalance.amount}
        />
      )}
    </>
  );
};
